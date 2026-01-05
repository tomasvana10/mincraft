import type { DelayableCommands } from "@mincraft/types";

function splitByUnescapedCommas(input: string) {
	const parts: string[] = [];
	let current = "";
	let i = 0;

	while (i < input.length) {
		if (input[i] === "\\" && i + 1 < input.length) {
			current += input[i] + input[i + 1];
			i += 2;
		} else if (input[i] === ",") {
			parts.push(current);
			current = "";
			i++;
		} else {
			current += input[i];
			i++;
		}
	}
	parts.push(current);

	return parts;
}

function unescapeString(input: string) {
	let result = "";
	let i = 0;

	while (i < input.length) {
		if (input[i] === "\\" && i + 1 < input.length) {
			const nextChar = input[i + 1];
			if (nextChar === "," || nextChar === "{" || nextChar === "}") {
				result += nextChar;
				i += 2;
			} else {
				result += input[i];
				i++;
			}
		} else {
			result += input[i];
			i++;
		}
	}

	return result;
}

export function parseExecCommands(input: string) {
	const result: DelayableCommands = [];
	const parts = splitByUnescapedCommas(input);

	const delayPattern = /^\{\{(\d+(?:\.\d+)?)\}\}$/;

	for (const part of parts) {
		const trimmed = part.trim();
		if (!trimmed) {
			continue;
		}

		const delayMatch = trimmed.match(delayPattern);
		if (delayMatch) {
			const delaySeconds = parseFloat(delayMatch[1]);
			const delayMs = Math.round(delaySeconds * 1000);
			result.push({ command: "", delay: delayMs });
		} else {
			const command = unescapeString(trimmed);
			result.push({ command, delay: 0 });
		}
	}

	return result;
}
