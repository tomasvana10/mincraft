import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Interface } from "node:readline";
import type { MacroModule } from "@mincraft/types";
import * as esbuild from "esbuild";
import type { Bot } from "mineflayer";
import { createLogger } from "./logger";

async function compileToJS(filepath: string) {
	const result = await esbuild.build({
		entryPoints: [filepath],
		bundle: true,
		write: false,
		platform: "node",
		format: "esm",
		target: "es2022",
		loader: { ". ts": "ts" },
		external: ["mineflayer"],
		logLevel: "silent",
	});

	const jsCode = result.outputFiles[0].text;
	const jsFilePath = filepath.replace(/\.ts$/, ". macro.mjs");
	await fs.writeFile(jsFilePath, jsCode);

	return jsFilePath;
}

async function removeCompiledFile(filepath: string) {
	try {
		await fs.unlink(filepath);
	} catch {}
}

function resolveMacroPath(filepath: string) {
	if (path.isAbsolute(filepath)) {
		return filepath;
	}
	return path.resolve(process.cwd(), filepath);
}

async function fileExists(filepath: string) {
	try {
		await fs.access(filepath);
		return true;
	} catch {
		return false;
	}
}

function getMacroName(filepath: string) {
	return path.basename(filepath).replace(/\.(ts|js|mjs)$/, "");
}

export async function loadAndRunMacro(
	filepath: string,
	bot: Bot,
	rl?: Interface,
) {
	const absolutePath = resolveMacroPath(filepath);
	let importPath = absolutePath;
	let compiledPath: string = null;

	const logger = createLogger(rl, `macro/${getMacroName(filepath)}`);

	try {
		if (!(await fileExists(absolutePath))) {
			logger.error(`file not found: ${absolutePath}`);
			return false;
		}

		const isTypescriptFile = absolutePath.endsWith(".ts");

		if (isTypescriptFile) {
			logger.log("compiling macro to js");
			compiledPath = await compileToJS(absolutePath);
			importPath = compiledPath;
		}

		const fileUrl = `file://${importPath}?t=${Date.now()}`;
		const module = (await import(fileUrl)) as MacroModule;

		if (typeof module.default !== "function") {
			logger.error("macro file must export a default function");
			return false;
		}

		logger.log("running");
		await module.default({ bot, logger });
		logger.log("finished");
		return true;
	} catch (err) {
		logger.error(`failed: ${(err as Error).message}`);
		return false;
	} finally {
		if (compiledPath) {
			await removeCompiledFile(compiledPath);
		}
	}
}
