import * as readline from "node:readline";
import type { Logger } from "@mincraft/types";

const GRAY = "\x1b[90m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

function formatScope(fullScope: string) {
	if (!fullScope) return "";

	const parts = fullScope.split("/");
	const colored = parts.map((part, i) => {
		if (i === 0) return `${GRAY}${part}${RESET}`;
		return `${BLUE}${part}${RESET}`;
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
