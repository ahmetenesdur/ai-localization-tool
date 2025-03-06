class ObjectTransformer {
	static flatten(obj, prefix = "") {
		return Object.keys(obj).reduce((acc, key) => {
			const newKey = prefix ? `${prefix}.${key}` : key;
			if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
				Object.assign(acc, this.flatten(obj[key], newKey));
			} else {
				acc[newKey] = obj[key];
			}
			return acc;
		}, {});
	}

	static unflatten(obj) {
		const result = {};
		for (const key in obj) {
			const keys = key.split(".");
			let current = result;
			keys.forEach((k, i) => {
				current[k] = current[k] || (i === keys.length - 1 ? obj[key] : {});
				current = current[k];
			});
		}
		return result;
	}
}

module.exports = ObjectTransformer;
