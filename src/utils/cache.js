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

	getHashKey(text, sourceLang, targetLang, options = {}) {
		const key = `${text}-${sourceLang}-${targetLang}-${JSON.stringify({
			context: options?.context || {},
		})}`;
		return crypto.createHash("md5").update(key).digest("hex");
	}

	get(text, sourceLang, targetLang, options) {
		const hash = this.getHashKey(text, sourceLang, targetLang, options);

		// First check memory cache
		if (this.memoryCache.has(hash)) {
			const cached = this.memoryCache.get(hash);
			if (
				Date.now() - new Date(cached.timestamp).getTime() <
				this.cacheExpiry
			) {
				return cached.translation;
			}
			this.memoryCache.delete(hash);
		}

		// Check disk cache
		const diskCached = this.diskCache[hash];
		if (
			diskCached &&
			Date.now() - new Date(diskCached.timestamp).getTime() <
				this.cacheExpiry
		) {
			// Add to memory cache
			this.addToMemoryCache(hash, diskCached);
			return diskCached.translation;
		}

		return null;
	}

	set(text, sourceLang, targetLang, options, translation) {
		const hash = this.getHashKey(text, sourceLang, targetLang, options);
		const cacheEntry = {
			translation,
			timestamp: new Date().toISOString(),
		};

		// Add to memory cache
		this.addToMemoryCache(hash, cacheEntry);

		// Add to disk cache
		this.diskCache[hash] = cacheEntry;
		this.saveCache();
	}

	addToMemoryCache(hash, entry) {
		// Check memory cache limit
		if (this.memoryCache.size >= this.maxMemoryItems) {
			// Remove oldest entry
			const oldestKey = this.memoryCache.keys().next().value;
			this.memoryCache.delete(oldestKey);
		}

		this.memoryCache.set(hash, entry);
	}
}

module.exports = TranslationCache;
