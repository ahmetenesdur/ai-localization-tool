"use strict";
/**
 * OPTIMIZED: Object transformation utilities with better performance and memory management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectTransformer = void 0;
/**
 * Object transformer utility for flattening, unflattening, and merging objects
 */
class ObjectTransformer {
    /**
     * OPTIMIZED: Flatten object with iterative approach for better performance
     * Prevents stack overflow for deeply nested objects
     */
    static flatten(obj, prefix = "", maxDepth = 20) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
            return prefix ? { [prefix]: obj } : {};
        }
        const result = {};
        const stack = [{ obj, prefix, depth: 0 }];
        while (stack.length > 0) {
            const stackItem = stack.pop();
            const currentObj = stackItem.obj;
            const currentPrefix = stackItem.prefix;
            const depth = stackItem.depth;
            if (depth > maxDepth) {
                // Prevent infinite recursion
                result[currentPrefix] = "[Object too deep]";
                continue;
            }
            const keys = Object.keys(currentObj);
            const keysLength = keys.length;
            for (let i = 0; i < keysLength; i++) {
                const key = keys[i];
                // Fix: Check if key is defined before using it
                if (key === undefined)
                    continue;
                const value = currentObj[key];
                const newKey = currentPrefix ? `${currentPrefix}.${key}` : key;
                if (value !== null &&
                    typeof value === "object" &&
                    !Array.isArray(value) &&
                    value.constructor === Object) {
                    stack.push({ obj: value, prefix: newKey, depth: depth + 1 });
                }
                else {
                    result[newKey] = value;
                }
            }
        }
        return result;
    }
    /**
     * OPTIMIZED: Unflatten object with improved memory efficiency and performance
     */
    static unflatten(obj) {
        if (!obj || typeof obj !== "object") {
            return {};
        }
        const result = {};
        const keys = Object.keys(obj);
        const keysLength = keys.length;
        keys.sort();
        for (let keyIndex = 0; keyIndex < keysLength; keyIndex++) {
            const key = keys[keyIndex];
            // Fix: Check if key is defined before using it
            if (key === undefined)
                continue;
            const value = obj[key];
            const keyParts = key.split(".");
            const partsLength = keyParts.length;
            if (partsLength === 0)
                continue;
            let hasEmptyPart = false;
            for (let i = 0; i < partsLength; i++) {
                if (keyParts[i] === "") {
                    hasEmptyPart = true;
                    break;
                }
            }
            if (hasEmptyPart)
                continue;
            let current = result;
            const lastIndex = partsLength - 1;
            for (let i = 0; i < lastIndex; i++) {
                const part = keyParts[i];
                // Fix: Check if part is defined before using it
                if (part === undefined)
                    continue;
                if (current[part] == null ||
                    typeof current[part] !== "object" ||
                    Array.isArray(current[part])) {
                    current[part] = {};
                }
                current = current[part];
            }
            // Fix: Check if keyParts[lastIndex] is defined before using it
            if (keyParts[lastIndex] !== undefined) {
                current[keyParts[lastIndex]] = value;
            }
        }
        return result;
    }
    /**
     * OPTIMIZED: Deep clone with circular reference protection
     */
    static deepClone(obj, seen = new WeakSet()) {
        if (obj === null || typeof obj !== "object") {
            return obj;
        }
        if (seen.has(obj)) {
            return {}; // Handle circular references
        }
        seen.add(obj);
        if (Array.isArray(obj)) {
            const result = obj.map((item) => this.deepClone(item, seen));
            seen.delete(obj);
            return result;
        }
        if (obj instanceof Date) {
            seen.delete(obj);
            return new Date(obj.getTime());
        }
        if (obj.constructor !== Object) {
            // Don't clone complex objects, return as-is
            seen.delete(obj);
            return obj;
        }
        const result = {};
        for (const key of Object.keys(obj)) {
            result[key] = this.deepClone(obj[key], seen);
        }
        seen.delete(obj);
        return result;
    }
    /**
     * OPTIMIZED: Merge objects efficiently with conflict resolution
     */
    static mergeObjects(target, source, overwriteArrays = false) {
        if (!target || !source || typeof target !== "object" || typeof source !== "object") {
            return target;
        }
        const result = this.deepClone(target);
        for (const key of Object.keys(source)) {
            const sourceValue = source[key];
            const targetValue = result[key];
            if (sourceValue === undefined) {
                continue;
            }
            if (Array.isArray(sourceValue)) {
                result[key] = overwriteArrays
                    ? [...sourceValue]
                    : Array.isArray(targetValue)
                        ? [...targetValue, ...sourceValue]
                        : [...sourceValue];
            }
            else if (sourceValue &&
                typeof sourceValue === "object" &&
                sourceValue.constructor === Object) {
                result[key] = this.mergeObjects(targetValue || {}, sourceValue, overwriteArrays);
            }
            else {
                result[key] = sourceValue;
            }
        }
        return result;
    }
}
exports.ObjectTransformer = ObjectTransformer;
exports.default = ObjectTransformer;
//# sourceMappingURL=object-transformer.js.map