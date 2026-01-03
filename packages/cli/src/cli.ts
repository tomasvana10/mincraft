import type { Config, ProxyCredentials } from "@mincraft/types";
import { type Command, Option, program } from "commander";
import { run } from "./runner";

// meta
program
	.name("mincraft")
	.description("Mineflayer CLI tool with supports for macros and proxies.")
	.version("1.0.0")
	.addHelpText(
		"after",
		`
Examples:
$ mincraft mc.hypixel.net 1.21.4 --ign FuriousDestroyer --email you@example.com
$ mincraft mythic.gg 1.7.10 -p 58585 --ign MangoSyrup --email you@example.com --prox proxy.com:1234:mango:secret
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
		'Execute REPL commands on startup, e.g. ".li\\nhello\\n.lo".',
		(val: string, prev: string[]) => prev.concat(val),
		[],
	)
	.option(
		"--exec-delay <DELAY>",
		"Timeout between exec commands in milliseconds",
		(val) => parseInt(val, 10),
		4000,
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

	const commands: string[] = [];
	for (const cmd of options.exec) {
		commands.push(...cmd.split("\\n").filter(Boolean));
	}
	await run(
		config,
		commands.length > 0 ? commands : undefined,
		commands.length > 0 ? options.execDelay : undefined,
	);
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
