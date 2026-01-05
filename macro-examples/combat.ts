import type { MacroContext } from "@mincraft/types";

const HOSTILE_MOBS = new Set(["zombie", "skeleton", "creeper"]);

function findNearestHostile(bot: MacroContext["bot"]) {
	let closest = null;
	let closestDist = Infinity;

	for (const id in bot.entities) {
		const entity = bot.entities[id];

		if (!entity.position || entity.type !== "hostile") {
			continue;
		}

		const entityName = entity.name?.toLowerCase();
		if (!entityName || !HOSTILE_MOBS.has(entityName)) {
			continue;
		}

		const dist = bot.entity.position.distanceTo(entity.position);

		if (dist < closestDist) {
			closest = entity;
			closestDist = dist;
		}
	}

	return closest;
}

export default async function ({ bot, logger }: MacroContext) {
	let target = findNearestHostile(bot);
	if (!target) {
		logger.log("no hostile mobs nearby");
		return;
	}

	logger.log(`acquired target: '${target.name}'`);

	while (bot.health > 6 && target && bot.entities[target.id]) {
		const distance = bot.entity.position.distanceTo(target.position);

		const entityHeight = target.height || 1.5;
		await bot.lookAt(target.position.offset(0, entityHeight, 0), true);

		if (distance > 3) {
			bot.setControlState("forward", true);
		} else {
			bot.setControlState("forward", false);
			bot.attack(target);
			await bot.waitForTicks(10);
		}

		await bot.waitForTicks(2);
		target = bot.entities[target.id];
	}

	bot.clearControlStates();
	logger.log("killed target");
}
