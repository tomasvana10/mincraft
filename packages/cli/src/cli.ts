import type {
	Config,
	DelayableCommands,
	ProxyCredentials,
} from "@mincraft/types";
import { type Command, Option, program } from "commander";
import { version } from ".";
import { parseExecCommands } from "./exec";
import { run } from "./repl";

// meta
program
	.name("mincraft")
	.description("Mineflayer CLI tool with supports for macros and proxies.")
	.version(version)
	.addHelpText(
		"after",
		`
Examples:
$ mincraft mc.hypixel.net 1.21.4 --ign FuriousDestroyer --email you@example.com
$ mincraft mythic.gg 1.7.10 -p 58585 --ign MangoSyrup --email you@example.com --prox proxy.com:1234:mango:secret
$ mincraft mc.hypixel.net 1.21.4 --ign Player --email you@example.com --exec "{{1}},.li,{{2.5}},hello,{{0.5}},.lo"
$ mincraft mc.hypixel.net 1.21.4 --ign Player --email you@example.com --exec "{{1.5}},.li,{{5}},hello\\,world,{{0.5}},.lo"
`,
	);

// server
program
	.argument("<host>", "Server hostname")
	.option(
		"-p, --port <PORT>",
		"Server port",
		(val) => parseInt(val, 10),
		25565,
	);

// client version
program.argument("<version>", "Client version, e.g. 1.21.4");

// proxy
const proxyFieldsInOrder = ["host", "port", "user", "pass"];
const defaultProxyFieldSep = ":";
program
	.option("--prox <HOST:PORT:USER:PASS>", "Connect to the server with a proxy")
	.option(
		"--prox-field-order <FORMAT>",
		'The order of the proxy credential fields, e.g. "user,pass,host,port".',
	)
	.option(
		"--prox-field-sep <SEP>",
		"The separator of the proxy credential fields",
	)
	.option(
		"--prox-type <4|5>",
		"The SOCKS proxy type",
		(val) => parseInt(val, 10),
		5,
	);

// account
const defaultAuthenticationMethod = "microsoft";
program
	.addOption(
		new Option("--ign <IN-GAME NAME>", "Player username").conflicts("uuid"),
	)
	.addOption(new Option("--uuid <UUID>", "Player UUID").conflicts("ign"))
	.requiredOption("--email <EMAIL>", "Account email")
	.option(
		"--auth <AUTH>",
		"Account authentication method",
		defaultAuthenticationMethod,
	);

// extra options
program
	.option("--no-log-messages", "Do not log messages your client receives")
	.option("--verbose", "Enable additional logging messages")
	.option(
		"--exec <COMMANDS>",
		'Execute REPL commands on startup with optional delays, e.g. "{{1}},.li,{{2.5}},hello,{{0.5}},.lo", where {{N}} represents a delay.' +
			" You can escape curly braces and commas to include them in commands/messages.",
		(val: string, prev: string[]) => prev.concat(val),
		[],
	);

program.action(async (_host, _version, options) => {
	if (!options.ign && !options.uuid) {
		program.error("error: must specify either --ign or --uuid");
	}

	if (options.proxFieldOrder) {
		const proxyFieldSep = options.proxyFieldSep ?? defaultProxyFieldSep;
		const proxyFieldNames: string[] =
			options.proxFieldOrder.split(proxyFieldSep);
		if (!proxyFieldNames.every((field) => proxyFieldsInOrder.includes(field))) {
			program.error("error: --prox-field-order includes invalid fields");
		}
	}

	const config = await getConfig(program);

	const commands: DelayableCommands = [];
	for (const cmd of options.exec) {
		const parsed = parseExecCommands(cmd);
		commands.push(...parsed);
	}
	await run(config, commands.length > 0 ? commands : undefined);
});

async function getIGN(uuid: string) {
	const res = await fetch(
		`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,
	);
	const data = (await res.json()) as { name?: string };
	if (!data?.name) {
		throw new Error("Could not fetch IGN from UUID");
	}

	return data.name;
}

async function getUUID(ign: string) {
	const res = await fetch(
		`https://api.mojang.com/users/profiles/minecraft/${ign}`,
	);
	const data = (await res.json()) as { id?: string };
	if (!data?.id) {
		throw new Error("Could not fetch UUID from IGN");
	}

	return data.id;
}

function resolveProxyCredentials(
	proxyString: string,
	fieldOrder: string[],
	fieldSep: string,
) {
	const proxyParts = proxyString.split(fieldSep);
	const credentials = Object.fromEntries(
		fieldOrder.map((field, i) => [field, proxyParts[i]]),
	) as unknown as ProxyCredentials;
	credentials.port = +credentials.port;

	return credentials;
}

async function getConfig(p: Command): Promise<Config> {
	const args = p.args;
	const opts = p.opts();

	return {
		server: {
			host: args[0],
			port: opts.port,
		},
		client: {
			version: args[1],
			account: {
				auth: opts.auth,
				uuid: opts.uuid ?? (await getUUID(opts.ign)),
				ign: opts.ign ?? (await getIGN(opts.uuid)),
				email: opts.email,
			},
		},
		...(opts.prox
			? {
					proxy: {
						...resolveProxyCredentials(
							opts.prox,
							opts.proxFieldOrder ?? proxyFieldsInOrder,
							opts.proxFieldSep ?? defaultProxyFieldSep,
						),
						type: opts.proxType,
					},
				}
			: {}),
		options: {
			logMessages: opts.noLogMessages ?? true,
			verboseLogging: opts.verbose ?? false,
		},
	};
}

export { program };
