const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class TranslationCache {
	constructor(cacheDir = "./.translation-cache") {
		this.cacheDir = path.resolve(cacheDir);
		this.init();
	}

	init() {
		if (!fs.existsSync(this.cacheDir)) {
			fs.mkdirSync(this.cacheDir, { recursive: true });
		}
	}

	getHashKey(text, sourceLang, targetLang, options) {
		return crypto
			.createHash("md5")
			.update(
				`${text}-${sourceLang}-${targetLang}-${JSON.stringify(options)}`
			)
			.digest("hex");
	}

	get(text, sourceLang, targetLang, options) {
		const hash = this.getHashKey(text, sourceLang, targetLang, options);
		const filePath = path.join(this.cacheDir, `${hash}.json`);

		if (fs.existsSync(filePath)) {
			return JSON.parse(fs.readFileSync(filePath, "utf-8")).translation;
		}
		return null;
	}

	set(text, sourceLang, targetLang, options, translation) {
		const hash = this.getHashKey(text, sourceLang, targetLang, options);
		const filePath = path.join(this.cacheDir, `${hash}.json`);

		fs.writeFileSync(
			filePath,
			JSON.stringify(
				{
					source: text,
					translation,
					timestamp: new Date().toISOString(),
				},
				null,
				2
			)
		);
	}
}

module.exports = TranslationCache;
