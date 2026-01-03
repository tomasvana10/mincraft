import type { MacroContext } from "@mincraft/types";

export default async function ({ bot, logger }: MacroContext) {
	logger.log("macro started!");

	bot.chat("/l");

	await new Promise((resolve) => setTimeout(resolve, 2000));

	bot.chat("sd");
	logger.log("macro finished!");
}
