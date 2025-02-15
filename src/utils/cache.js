const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class TranslationCache {
	constructor(cacheFile = "./.translation-cache/cache.json") {
		this.cacheFile = path.resolve(cacheFile);
		this.cacheDir = path.dirname(this.cacheFile);
		this.memoryCache = new Map();
		this.maxMemoryItems = 1000;
		this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
		this.diskCache = {};
		this.init();
	}

	init() {
		if (!fs.existsSync(this.cacheDir)) {
			fs.mkdirSync(this.cacheDir, { recursive: true });
		}
		this.loadCache();
	}

	loadCache() {
		try {
			if (fs.existsSync(this.cacheFile)) {
				this.diskCache = JSON.parse(
					fs.readFileSync(this.cacheFile, "utf-8")
				);
			}
		} catch (err) {
			console.error("Cache load error:", err.message);
			this.diskCache = {};
		}
	}

	saveCache() {
		try {
			fs.writeFileSync(
				this.cacheFile,
				JSON.stringify(this.diskCache, null, 2)
			);
		} catch (err) {
			console.error("Cache save error:", err.message);
		}
	}

	getHashKey(text, sourceLang, targetLang, options) {
		const key = `${text}-${sourceLang}-${targetLang}-${JSON.stringify({
			context: options.context,
		})}`;
		return crypto.createHash("md5").update(key).digest("hex");
	}

	get(text, sourceLang, targetLang, options) {
		const hash = this.getHashKey(text, sourceLang, targetLang, options);
		return this.diskCache[hash]?.translation || null;
	}

	set(text, sourceLang, targetLang, options, translation) {
		const hash = this.getHashKey(text, sourceLang, targetLang, options);
		this.diskCache[hash] = {
			translation,
			timestamp: new Date().toISOString(),
		};
		this.saveCache();
	}
}

module.exports = TranslationCache;
