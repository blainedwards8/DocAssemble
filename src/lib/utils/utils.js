
export const resolveVariables = (text, variables, isCopying = false, pathPrefix = "") => {
    if (!text) return "";

    // 1. Process Loops
    let processedText = text.replace(/\{#foreach\s+([a-zA-Z0-9_-]+)\}([\s\S]*?)\{\/foreach\}/g, (match, listKey, subContent) => {
        const listData = variables[listKey];
        if (!Array.isArray(listData) || listData.length === 0) {
            if (isCopying) return "";
            return `<div class="border-2 border-dashed border-amber-300 bg-amber-50 p-4 rounded-xl text-amber-700 italic text-sm my-4 flex items-center gap-2">
                List Variable {${listKey}} is empty.
            </div>`;
        }
        // distinct key for each item in loop based on prefix
        const basePrefix = pathPrefix ? `${pathPrefix}.${listKey}` : listKey;
        return listData.map((item, index) => resolveVariables(subContent, item, isCopying, `${basePrefix}[${index}]`)).join("");
    });

    // 2. Process Variables
    const varRegex = /\{([a-zA-Z0-9_-]+)(?:\|([a-zA-Z0-9_-]+))?(?:\[(.*?)\])?\}/g;
    return processedText.replace(varRegex, (match, name, type, options) => {
        const isFilled = variables[name] !== undefined && variables[name] !== "";
        // For display, if not filled, we show the {name} part but strip the metadata if it's too long?
        // Actually, user expects to see the placeholder. Let's show the "clean" placeholder if not filled?
        // Usually, seeing the type info in the document might be confusing. 
        // Let's show {name} as the placeholder.
        const placeholder = `{${name}}`;
        const displayValue = isFilled ? variables[name] : placeholder;
        const copyValue = isFilled ? variables[name] : placeholder;

        if (isCopying) return copyValue;

        const fullPath = pathPrefix ? `${pathPrefix}.${name}` : name;

        // Encode metadata into data attribute if needed, or just the name. 
        // App.jsx will use variableConfigs which we will auto-supplement.

        // Add Data Attribute for Click Handler
        return isFilled
            ? `<span data-variable="${fullPath}" class="bg-emerald-50 hover:bg-emerald-100 cursor-pointer text-emerald-700 px-1 rounded font-bold border border-dashed border-emerald-300 font-mono text-[0.85em] transition-colors" title="Click to Edit">${displayValue}</span>`
            : `<span data-variable="${fullPath}" class="bg-amber-50 hover:bg-amber-100 cursor-pointer text-amber-700 px-1 rounded border border-dashed border-amber-300 font-mono text-[0.85em] font-bold transition-colors" title="Click to Edit">${displayValue}</span>`;
    });
};

export const parseMarkdown = (text, startOffset = 1, continuous = false, tierStyles = []) => {
    if (!text) return "";
    const lines = text.split('\n');
    let result = [];
    let listStack = [];
    const closeLists = (toLevel) => { while (listStack.length > toLevel) result.push(`</${listStack.pop()}>`); };

    lines.forEach(line => {
        const headerMatch = line.match(/^(#{1,3}) (.*$)/);
        const listMatch = line.match(/^(\s*)([0-9a-zA-Z]+|\*|-)[.)] (.*$)/);

        if (headerMatch) {
            closeLists(0);
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            const classes = level === 1 ? "text-2xl font-black mt-6 mb-4 text-center border-b-2 pb-2" :
                level === 2 ? "text-xl font-bold mt-5 mb-3 border-b border-slate-100" :
                    "text-lg font-bold mt-4 mb-2 text-slate-700";
            result.push(`<h${level} class="${classes}">${content}</h${level}>`);
        } else if (listMatch) {
            const indent = listMatch[1].length;
            const level = Math.floor(indent / 2);
            const isOrdered = !['*', '-'].includes(listMatch[2]);
            const type = isOrdered ? 'ol' : 'ul';

            if (level < listStack.length - 1) closeLists(level + 1);
            if (level >= listStack.length) {
                const startAttr = (level === 0 && continuous) ? ` start="${startOffset}"` : "";
                const tierStyle = isOrdered ? (tierStyles[level] || 'decimal') : 'disc';
                result.push(`<${type}${startAttr} class="list-${tierStyle} space-y-1 ml-6 mb-4" style="list-style-type: ${tierStyle}">`);
                listStack.push(type);
            }

            const formattedContent = listMatch[3]
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            result.push(`<li class="pl-2 leading-relaxed">${formattedContent}</li>`);
        } else {
            if (line.trim() === "") closeLists(0);
            else {
                closeLists(0);
                const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
                result.push(`<p class="mb-4 text-justify leading-relaxed">${formattedLine}</p>`);
            }
        }
    });
    closeLists(0);
    return result.join('');
};


// --- 3. Save Function ---
export const triggerSave = async (content, filename, mimeType) => {
    if (typeof window.showSaveFilePicker === 'function') {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: 'File', accept: { [mimeType]: [`.${filename.split('.').pop()}`] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            return;
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Save failed', err);
            // Fallback if user cancels or error
        }
    }

    // Fallback
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- 4. Nested Property Helpers ---
export const getNestedValue = (obj, path) => {
    if (!path) return undefined;
    const parts = path.split(/[\.\[\]]+/).filter(Boolean);
    let current = obj;
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    return current;
};

export const setNestedValue = (obj, path, value) => {
    const parts = path.split(/[\.\[\]]+/).filter(Boolean);
    const newObj = Array.isArray(obj) ? [...obj] : { ...obj };

    let current = newObj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];

        // Ensure structure exists
        if (current[part] === undefined) {
            // Try to determine if next is index -> array, else object
            const isNum = !isNaN(parts[i + 1]);
            current[part] = isNum ? [] : {};
        }

        // Clone next level for immutability
        if (Array.isArray(current[part])) {
            current[part] = [...current[part]];
        } else {
            current[part] = { ...current[part] };
        }

        current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;

    return newObj;
};

// --- 5. Metadata Extraction ---
export const extractStructureMetadata = (markdown) => {
    if (!markdown) return { variables: [], sections: [], loops: [], variableMeta: {} };

    const variables = new Set();
    const variableMeta = {};
    const sections = [];
    const loops = new Set();

    const lines = markdown.split('\n');

    lines.forEach(line => {
        // 1. Sections [[Label|Category]] or [[Label|Category|Tag]]
        const sectionMatch = line.match(/^\[\[([^|\]]+)(?:\|([^|\]]+))?.*\]\]$/);
        if (sectionMatch) {
            sections.push({
                level: 1, // Double brackets are always top-level structural split points
                title: sectionMatch[1].trim(),
                category: sectionMatch[2] ? sectionMatch[2].trim() : null
            });
        }

        // 2. Loops ({#foreach list})
        const loopMatch = line.match(/\{#foreach\s+([a-zA-Z0-9_-]+)\}/);
        if (loopMatch) {
            loops.add(loopMatch[1]);
        }
    });

    // 3. Variables ({var_name}, {var|date}, {var[Opt1,Opt2]}) - everywhere in text
    const varRegex = /\{([a-zA-Z0-9_-]+)(?:\|([a-zA-Z0-9_-]+))?(?:\[(.*?)\])?\}/g;
    const varMatches = markdown.matchAll(varRegex);
    for (const match of varMatches) {
        const name = match[1];
        const type = match[2];
        const optionsStr = match[3];

        variables.add(name);
        if (type || optionsStr) {
            variableMeta[name] = {
                type: type || (optionsStr ? 'select' : 'text'),
                options: optionsStr ? optionsStr.split(',').map(o => o.trim()) : undefined
            };
        }
    }

    return {
        variables: Array.from(variables).sort(),
        variableMeta,
        sections,
        loops: Array.from(loops).sort()
    };
};
