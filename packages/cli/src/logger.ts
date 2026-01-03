import * as readline from "node:readline";
import type { Logger } from "@mincraft/types";

export function createLogger(rl?: readline.Interface): Logger {
	const format = (msg: string, scope = "") =>
		`[mc${scope ? `/${scope}` : ""}] ${msg}`;

	const write = (msg: string) => {
		if (rl) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			console.log(msg);
			rl.prompt(true);
		} else {
			console.log(msg);
		}
	};

	return {
		log: (msg: string, scope?: string) => write(format(msg, scope)),
		warn: (msg: string, scope = "warn") => write(format(msg, scope)),
		error: (msg: string, scope = "err") => write(format(msg, scope)),
		raw: write,
	};
}
