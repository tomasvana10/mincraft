import type { Bot } from "mineflayer";
import type { SocksProxyType } from "socks/typings/common/constants";

export type LogFn = (msg: string, scope?: string) => void;

export interface Logger {
	log: LogFn;
	warn: LogFn;
	error: LogFn;
	raw: (msg: string) => void;
}

export interface MacroContext {
	bot: Bot;
	logger: Logger;
}

export type MacroFunction = (ctx: MacroContext) => void | Promise<void>;

export interface MacroModule {
	default: MacroFunction;
}

export interface ProxyCredentials {
	host: string;
	port: number;
	user: string;
	pass: string;
}

export interface Config {
	proxy?: ProxyCredentials & { type: SocksProxyType };
	server: {
		host: string;
		port: number;
	};
	client: {
		version: string;
		account: {
			auth: string;
			uuid: string;
			ign: string;
			email: string;
		};
	};
	options: {
		logMessages: boolean;
		verboseLogging: boolean;
	};
}
