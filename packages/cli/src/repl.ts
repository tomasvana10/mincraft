import * as readline from "node:readline";
import type { Config, DelayableCommands } from "@mincraft/types";
import chalk from "chalk";
import { BotClient } from "./bot";
import { createLogger } from "./logger";
import { loadAndRunMacro } from "./macro";
import { version } from "./version";

export enum BotCommand {
	Exit = ".exit",
	Logout = ".lo",
	Login = ".li",
	Macro = ".macro",
	Help = ".help",
}

function isCommand(value: string) {
	return Object.values(BotCommand).some((cmd) => value.startsWith(cmd));
}

function showReplHelp(log: (msg: string) => void, serverHost: string) {
	log(`type ${chalk.magenta(".li")} to log in to ${serverHost}`);
	log(`type ${chalk.magenta(".lo")} to log out from ${serverHost}`);
	log(`type ${chalk.magenta(".macro <filepath>")} to run a macro`);
	log(`type ${chalk.magenta(".help")} to show this REPL reference`);
	log(`type ${chalk.magenta(".exit")} to exit the REPL`);
	log(`type ${chalk.bold("any other value")} to send a message to the server`);
}

export async function run(config: Config, commands?: DelayableCommands) {
	process.stdout.write("\u001b[2J\u001b[2;0H");
	let bot: BotClient = null;

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const logger = createLogger(rl);
	const helpLogger = (msg: string) => logger.raw(`>> ${msg}`);

	rl.setPrompt("> ");

	const handleInput = async (input: string) => {
		input = input.trim();

		if (!input) {
			return false;
		}

		if (!isCommand(input) && !bot?.isLoggedIn) {
			logger.error("log in using .li before sending messages");
			return false;
		}

		if (isCommand(input)) {
			const [cmd, ...args] = input.split(" ");

			switch (cmd) {
				case BotCommand.Exit: {
					bot?.disconnect();
					rl.close();
					return true;
				}
				case BotCommand.Login: {
					if (bot?.isLoggedIn) {
						logger.error("client is already logged in");
					} else {
						bot = new BotClient(config, logger);
						bot.registerAndLogIn();
					}
					break;
				}
				case BotCommand.Logout: {
					if (!bot?.isLoggedIn) {
						logger.error("client isn't logged in");
					} else {
						bot?.disconnect();
					}
					break;
				}
				case BotCommand.Macro: {
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
				case BotCommand.Help: {
					showReplHelp(helpLogger, config.server.host);
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
	helpLogger('type ".help" for more information.');

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
