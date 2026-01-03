import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MacroContext, MacroModule } from "@mincraft/types";
import * as esbuild from "esbuild";

async function compileToJS(filepath: string) {
	const result = await esbuild.build({
		entryPoints: [filepath],
		bundle: true,
		write: false,
		platform: "node",
		format: "esm",
		target: "es2022",
		loader: { ".ts": "ts" },
		external: ["mineflayer"],
		logLevel: "silent",
	});

	const jsCode = result.outputFiles[0].text;
	const jsFilePath = filepath.replace(/\.ts$/, ".macro.mjs");
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

export async function loadAndRunMacro(filepath: string, ctx: MacroContext) {
	const absolutePath = resolveMacroPath(filepath);
	let importPath = absolutePath;
	let compiledPath: string = null;

	try {
		if (!(await fileExists(absolutePath))) {
			ctx.logger.error(`macro file not found: ${absolutePath}`);
			return false;
		}

		const isTypescriptFile = absolutePath.endsWith(".ts");

		if (isTypescriptFile) {
			ctx.logger.log("compiling typescript macro");
			compiledPath = await compileToJS(absolutePath);
			importPath = compiledPath;
		}

		const fileUrl = `file://${importPath}?t=${Date.now()}`;
		const module = (await import(fileUrl)) as MacroModule;

		if (typeof module.default !== "function") {
			ctx.logger.error("macro file must export a default function");
			return false;
		}

		await module.default(ctx);
		return true;
	} catch (err) {
		ctx.logger.error(`could not load macro: ${(err as Error).message}`);
		return false;
	} finally {
		if (compiledPath) {
			await removeCompiledFile(compiledPath);
		}
	}
}
