/**
 * Retrieves a value from a nested object using a string path (e.g., "client.address.city" or "party[0].name").
 * @param {Object} obj - The source object.
 * @param {string} path - The dot/bracket notation path.
 * @returns {any} - The value at the path, or undefined.
 */
export function getNestedValue(obj, path) {
    if (!path) return undefined;
    const keys = path.split(/[.\[\]]+/).filter(Boolean);
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined) return undefined;
        current = current[key];
    }
    return current;
}

/**
 * Sets a value in a nested object using a string path. Mutates the object.
 * @param {Object} obj - The target object.
 * @param {string} path - The dot/bracket notation path.
 * @param {any} value - The value to set.
 * @returns {Object} - The modified object.
 */
export function setNestedValue(obj, path, value) {
    if (!path) return obj;
    const keys = path.split(/[.\[\]]+/).filter(Boolean);
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        // If the next key is a number, initialize as array if missing
        const nextKey = keys[i + 1];
        const isNextKeyInt = !isNaN(parseInt(nextKey));

        if (!(key in current) || current[key] === null) {
            current[key] = isNextKeyInt ? [] : {};
        }
        current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return obj;
}

/**
 * Extracts configuration and type metadata from the raw template string.
 * Looks for specific syntax like [[config: name | type: date]] or a trailing JSON block.
 * @param {string} template - The raw markdown/template string.
 * @returns {Object} - An object containing variableMeta and other document settings.
 */
export function extractStructureMetadata(template) {
    const meta = {
        variableMeta: {}
    };

    if (!template) return meta;

    // 1. Look for a JSON metadata block at the end of the file 
    // Format: <!-- METADATA { ... } -->
    const jsonMatch = template.match(/<!--\s*METADATA\s*([\s\S]*?)\s*-->/);
    if (jsonMatch && jsonMatch[1]) {
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.variableMeta) {
                meta.variableMeta = { ...meta.variableMeta, ...parsed.variableMeta };
            }
            // Merge other top-level metadata if present
            Object.assign(meta, parsed);
        } catch (e) {
            console.error("Failed to parse template metadata block:", e);
        }
    }

    // 2. Look for inline type hints like [[type: variableName | date]]
    const inlineRegex = /\[\[type:\s*([a-zA-Z0-9._-]+)\s*\|\s*([a-z]+)(?:\s*\|\s*([^\]]+))?\]\]/g;
    let match;
    while ((match = inlineRegex.exec(template)) !== null) {
        const [_, path, type, optionsStr] = match;
        const leafName = path.split('.').pop();
        
        meta.variableMeta[leafName] = {
            type: type.trim(),
            options: optionsStr ? optionsStr.split(',').map(s => s.trim()) : []
        };
    }

    return meta;
}