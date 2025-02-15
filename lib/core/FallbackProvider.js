class FallbackProvider {
	constructor(providers) {
		this.providers = providers;
		this.currentIndex = 0;
	}

	async translate(text, sourceLang, targetLang, options) {
		const errors = [];

		while (this.currentIndex < this.providers.length) {
			const currentProvider = this.providers[this.currentIndex];

			try {
				const result = await currentProvider.translate(
					text,
					sourceLang,
					targetLang,
					options
				);
				return result;
			} catch (error) {
				errors.push({
					provider: currentProvider.constructor.name,
					error: error.message,
				});

				console.warn(
					`Provider ${currentProvider.constructor.name} failed, attempting next provider...`
				);
				this.currentIndex++;
			}
		}

		// All providers failed
		this.currentIndex = 0; // Reset counter
		throw new Error(
			`All providers failed:\n${JSON.stringify(errors, null, 2)}`
		);
	}

	reset() {
		this.currentIndex = 0;
	}
}

module.exports = FallbackProvider;
