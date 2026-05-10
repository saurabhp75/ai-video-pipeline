type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

let currentLevel: LogLevel = "info";

function timestamp(): string {
	return new Date().toISOString();
}

function format(level: LogLevel, message: string, data?: unknown): string {
	const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
	if (data !== undefined) {
		return `${base}\n${JSON.stringify(data, null, 2)}`;
	}
	return base;
}

export const logger = {
	setLevel(level: LogLevel) {
		currentLevel = level;
	},

	debug(message: string, data?: unknown) {
		if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
			console.debug(format("debug", message, data));
		}
	},

	info(message: string, data?: unknown) {
		if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
			console.info(format("info", message, data));
		}
	},

	warn(message: string, data?: unknown) {
		if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
			console.warn(format("warn", message, data));
		}
	},

	error(message: string, data?: unknown) {
		if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
			console.error(format("error", message, data));
		}
	},

	step(step: number, total: number, message: string) {
		this.info(`[${step}/${total}] ${message}`);
	},
};
