const fs = require("fs");
const path = require("path");

class FileManager {
	static findLocaleFiles(localesDir, sourceLang) {
		const sourceFile = path.join(localesDir, `${sourceLang}.json`);

		if (!fs.existsSync(sourceFile)) {
			throw new Error(`Source language file not found: ${sourceFile}`);
		}

		return [sourceFile];
	}

	static readJSON(filePath) {
		try {
			return JSON.parse(fs.readFileSync(filePath, "utf-8"));
		} catch (err) {
			throw new Error(`File read error: ${err.message}`);
		}
	}

	static writeJSON(filePath, data) {
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
	}
}

module.exports = FileManager;
