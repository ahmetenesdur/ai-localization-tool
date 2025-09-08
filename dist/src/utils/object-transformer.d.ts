/**
 * OPTIMIZED: Object transformation utilities with better performance and memory management
 */
/**
 * Object transformer utility for flattening, unflattening, and merging objects
 */
export declare class ObjectTransformer {
    /**
     * OPTIMIZED: Flatten object with iterative approach for better performance
     * Prevents stack overflow for deeply nested objects
     */
    static flatten(obj: any, prefix?: string, maxDepth?: number): Record<string, any>;
    /**
     * OPTIMIZED: Unflatten object with improved memory efficiency and performance
     */
    static unflatten(obj: Record<string, any>): Record<string, any>;
    /**
     * OPTIMIZED: Deep clone with circular reference protection
     */
    static deepClone<T>(obj: T, seen?: WeakSet<object>): T;
    /**
     * OPTIMIZED: Merge objects efficiently with conflict resolution
     */
    static mergeObjects(target: Record<string, any>, source: Record<string, any>, overwriteArrays?: boolean): Record<string, any>;
}
export default ObjectTransformer;
//# sourceMappingURL=object-transformer.d.ts.map