import * as readline from "node:readline";
import type { Logger } from "@mincraft/types";
import chalk from "chalk";

function formatScope(fullScope: string) {
	if (!fullScope) return "";

	const parts = fullScope.split("/");
	const colored = parts.map((part, i) => {
		if (i === 0) {
			if (part === "err") return chalk.red(part);
			if (part === "warn") return chalk.yellow(part);
			return chalk.gray(part);
		}
		return chalk.blue(part);
	});

	return `/${colored.join("/")}`;
}

export function createLogger(
	rl?: readline.Interface,
	baseScope?: string,
): Logger {
	const format = (msg: string, scope = "") => {
		const fullScope = baseScope
			? scope
				? `${baseScope}/${scope}`
				: baseScope
			: scope;
		return `[mc${formatScope(fullScope)}] ${msg}`;
	};

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
