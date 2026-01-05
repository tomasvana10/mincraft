import * as readline from "node:readline";
import type { Config, DelayableCommands } from "@mincraft/types";
import chalk from "chalk";
import type { LiteralStringUnion } from ".";
import { BotClient } from "./bot";
import { createLogger } from "./logger";
import { loadAndRunMacro } from "./macro";
import { version } from "./version";

export enum ReplCommand {
	Exit = ".exit",
	Logout = ".lo",
	Login = ".li",
	Macro = ".macro",
	Clear = ".cls",
	Help = ".help",
}

function isReplCommand(value: string) {
	return Object.values(ReplCommand).some((cmd) => value.startsWith(cmd));
}

function clearRepl() {
	process.stdout.write("\u001b[2J\u001b[2;0H");
}

function describeReplCommand(
	log: (msg: string) => void,
	command: LiteralStringUnion<ReplCommand>,
	description: string,
	args?: string[],
) {
	const argstr = args ? ` ${args.map((arg) => `<${arg}>`).join(" ")}` : "";
	log(`type ${chalk.magenta(`${command}${argstr}`)} ${description}`);
}

function showReplHelp(log: (msg: string) => void, serverHost: string) {
	describeReplCommand(log, ReplCommand.Login, `to log in to ${serverHost}`);
	describeReplCommand(log, ReplCommand.Logout, `to log out from ${serverHost}`);
	describeReplCommand(log, ReplCommand.Macro, "to run a macro", ["filepath"]);
	describeReplCommand(log, ReplCommand.Clear, "to clear the REPL history");
	describeReplCommand(log, ReplCommand.Exit, "to exit the REPL");
	describeReplCommand(log, ReplCommand.Help, "to show this documentation");
	describeReplCommand(
		log,
		"any other value",
		"to send a message to the server",
	);
}

export async function run(config: Config, commands?: DelayableCommands) {
	clearRepl();
	let bot: BotClient = null;

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const logger = createLogger(rl);
	const logHelp = (msg: string) => logger.raw(`>> ${msg}`);

	rl.setPrompt("> ");

	const handleInput = async (input: string) => {
		input = input.trim();

		if (!input) {
			return false;
		}

		if (!isReplCommand(input) && !bot?.isLoggedIn) {
			logger.error("log in using .li before sending messages");
			return false;
		}

		if (isReplCommand(input)) {
			const [cmd, ...args] = input.split(" ");

			switch (cmd) {
				case ReplCommand.Exit: {
					bot?.disconnect();
					rl.close();
					return true;
				}
				case ReplCommand.Login: {
					if (bot?.isLoggedIn) {
						logger.error("client is already logged in");
					} else {
						bot = new BotClient(config, logger);
						bot.registerAndLogIn();
					}
					break;
				}
				case ReplCommand.Logout: {
					if (!bot?.isLoggedIn) {
						logger.error("client isn't logged in");
					} else {
						bot?.disconnect();
					}
					break;
				}
				case ReplCommand.Macro: {
					if (!bot?.isLoggedIn) {
						logger.error("client must be logged in to run macros");
						break;
					}
					const filepath = args.join(" ");
					if (!filepath) {
						logger.error("usage: .macro <filepath>");
						break;
					}
					const mineflayer = bot.bot;
					if (mineflayer) {
						await loadAndRunMacro(filepath, mineflayer, rl);
					}
					break;
				}
				case ReplCommand.Help: {
					showReplHelp(logHelp, config.server.host);
					break;
				}
				case ReplCommand.Clear: {
					clearRepl();
					break;
				}
			}
		} else {
			bot?.sendMessage(input);
		}

		return false;
	};

	rl.on("line", async (input) => {
		const shouldExit = await handleInput(input);
		if (shouldExit) {
			process.exit(0);
		}
		rl.prompt();
	});

	console.log(chalk.green(`mincraft REPL ${version}`));
	logHelp('type ".help" for more information.');

	if (commands && commands.length > 0) {
		for (const { command, delay } of commands) {
			if (delay > 0) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
			if (command) {
				logger.raw(`> ${command}`);
				const shouldExit = await handleInput(command);
				if (shouldExit) {
					process.exit(0);
				}
			}
		}
	}

	rl.prompt();
}
