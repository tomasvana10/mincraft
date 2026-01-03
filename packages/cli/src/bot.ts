import type { Config, Logger } from "@mincraft/types";
import { type Bot, type BotOptions, createBot } from "mineflayer";
import { SocksClient } from "socks";

export class BotClient {
	public proxy: Config["proxy"];
	public client: Config["client"];
	public server: Config["server"];
	public options: Config["options"];
	public logger: Logger;

	public isLoggedIn: boolean;
	public bot: Bot;

	public constructor(
		{ proxy, client, server, options }: Config,
		logger: Logger,
	) {
		this.proxy = proxy;
		this.client = client;
		this.server = server;
		this.options = options;
		this.logger = logger;

		this.isLoggedIn = false;
	}

	public async registerAndLogIn() {
		const botOptions: BotOptions = {
			host: this.server.host,
			port: this.server.port,
			username: this.client.account.email,
			auth: this.client.account.auth as BotOptions["auth"],
			version: this.client.version,
			hideErrors: true,
		};

		if (this.proxy) {
			botOptions.connect = (client) => {
				this.connectViaProxy(client);
			};
		}

		this.bot = createBot(botOptions);
		if (this.options.verboseLogging) {
			this.registerClientEvents();
		}
		this.registerBotEvents();
	}

	private connectViaProxy(client: any) {
		this.logger.log("connecting via proxy");
		const { host, port, user: userId, pass: password, type } = this.proxy;
		const destination = this.server;

		SocksClient.createConnection({
			proxy: {
				host,
				port,
				type,
				userId,
				password,
			},
			command: "connect",
			destination: { host: destination.host, port: destination.port },
			timeout: 30000,
		})
			.then((info) => {
				client.setSocket(info.socket);
				client.emit("connect");
			})
			.catch((err) => {
				this.logger.error(`proxy connection failed: ${err.message}`);
				client.emit("error", err);
			});
	}

	private registerClientEvents() {
		this.bot._client.on("connect", () => {
			this.logger.log("TCP connection established");
		});

		this.bot._client.on("login", () => {
			this.logger.log("login packet received");
		});

		this.bot._client.on("error", (err) => {
			this.logger.error(`client error: ${err.message}`);
		});

		this.bot._client.on("end", (reason) => {
			this.logger.warn(`client ended: ${reason}`);
		});
	}

	private registerBotEvents() {
		this.bot.once("spawn", () => {
			const { ign, uuid } = this.client.account;
			this.logger.log(`logged in as ${ign} (${uuid})`);
			this.isLoggedIn = true;
		});

		this.bot.once("kicked", (reason) => {
			this.logger.warn(`kicked: ${JSON.stringify(reason)}`);
			this.disconnect();
		});

		this.bot.once("error", (err) => {
			this.logger.error(`bot error: ${err.message}`);
			this.isLoggedIn = false;
		});

		this.bot.once("end", (reason) => {
			this.logger.warn(`disconnected by server: ${JSON.stringify(reason)}`);
			this.disconnect();
		});

		if (this.options.logMessages) {
			this.bot.on("messagestr", (message: string) => {
				const lines = message.split("\n");
				if (lines.length === 1) {
					this.logger.log(message, "chat");
				} else {
					this.logger.log(lines[0], "chat");
					for (let i = 1; i < lines.length; i++) {
						this.logger.raw(`          ${lines[i]}`);
					}
				}
			});
		}
	}

	public disconnect() {
		if (!this.bot) return;
		if (this.proxy) {
			this.bot._client.socket?.destroy();
		} else {
			this.bot.quit();
		}
		this.isLoggedIn = false;
	}

	public sendMessage(msg: string) {
		this.bot.chat(msg);
	}
}
