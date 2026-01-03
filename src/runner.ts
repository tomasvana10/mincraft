import * as readline from "node:readline";
import type { Config } from "@mincraft/types";
import { BotClient } from "./bot";
import { createLogger } from "./logger";
import { loadAndRunMacro } from "./macro";

export enum BotCommand {
	Exit = ".exit",
	Logout = ".lo",
	Login = ".li",
	Macro = ".macro",
}

function isCommand(value: string) {
	return Object.values(BotCommand).some((cmd) => value.startsWith(cmd));
}

export async function run(config: Config) {
	let bot: BotClient | null = null;

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const logger = createLogger(rl);

	rl.setPrompt("> ");

	const handleInput = async (input: string) => {
		input = input.trim();

		if (!isCommand(input) && !bot?.isLoggedIn) {
			logger.raw("log in using .li before sending messages");
			rl.prompt();
			return;
		}

		if (isCommand(input)) {
			const [cmd, ...args] = input.split(" ");
			let exit = false;

			switch (cmd) {
				case BotCommand.Exit: {
					bot?.disconnect();
					rl.close();
					exit = true;
					break;
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
						logger.log(`loading macro: ${filepath}`);
						await loadAndRunMacro(filepath, { bot: mineflayer, logger });
					}
					break;
				}
			}

			if (exit) {
				process.exit(0);
			}
		} else {
			bot?.sendMessage(input);
		}

		rl.prompt();
	};

	rl.on("line", handleInput);

	console.log("=== mincraft REPL ===");
	console.log("input plain text to send a message to the server");
	console.log(`input .li to log in to ${config.server.host}`);
	console.log(`input .lo to log out from ${config.server.host}`);
	console.log("input .macro <filepath> to run a macro");
	console.log("input .exit to exit the REPL");

	rl.prompt();
}
