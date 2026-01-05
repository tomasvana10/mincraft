import type { MacroContext } from "@mincraft/types";

export default async function ({ bot, logger }: MacroContext) {
	logger.log("macro started!");

	bot.attack(bot.nearestEntity()!);

	logger.log("macro finished!");
}
