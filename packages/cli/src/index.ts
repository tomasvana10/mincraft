import { program } from "./cli.js";
import { createLogger } from "./logger.js";

export const defaultLogger = createLogger();
export const log = defaultLogger.log;
export const warn = defaultLogger.warn;
export const error = defaultLogger.error;

export const version = "v1.5.0";

program.parse();
