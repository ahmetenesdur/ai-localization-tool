const fs = require("fs");
const path = require("path");

class FileManager {
	static findLocaleFiles(localesDir) {
		const files = [];

		function walk(dir) {
			const items = fs.readdirSync(dir);
			items.forEach((file) => {
				const filepath = path.join(dir, file);
				const stat = fs.statSync(filepath);
				stat.isDirectory()
					? walk(filepath)
					: filepath.endsWith(".json") && files.push(filepath);
			});
		}

		walk(localesDir);
		return files;
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
