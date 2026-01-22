// Helper function to apply mixins to a class
export function applyMixins(derivedCtor: any, constructors: any[], overwrite: boolean = true) {
	for (const baseCtor of constructors) {
		const ownPropertyNames = Object.getOwnPropertyNames(baseCtor.prototype);
		for (const name of ownPropertyNames) {
			/*if (name == "constructor") {
				Object.defineProperty(
					derivedCtor.prototype,
					baseCtor.name + "Constructor",
					Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
					Object.create(null)
				);
			}
			else {
				Object.defineProperty(
					derivedCtor.prototype,
					name,
					Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
					Object.create(null)
				);
			}
			*/
			if (overwrite || !derivedCtor.prototype.hasOwnProperty(name)) {
				Object.defineProperty(
					derivedCtor.prototype,
					name,
					Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
					Object.create(null)
				);
			}
		}
	}
}