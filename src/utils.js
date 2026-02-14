
export const resolveVariables = (text, variables, isCopying = false) => {
    if (!text) return "";

    // 1. Process Loops
    let processedText = text.replace(/\{#foreach\s+([a-zA-Z0-9_]+)\}([\s\S]*?)\{\/foreach\}/g, (match, listKey, subContent) => {
        const listData = variables[listKey];
        if (!Array.isArray(listData) || listData.length === 0) {
            if (isCopying) return "";
            return `<div class="border-2 border-dashed border-amber-300 bg-amber-50 p-4 rounded-xl text-amber-700 italic text-sm my-4 flex items-center gap-2">
                List Variable {${listKey}} is empty.
            </div>`;
        }
        return listData.map((item) => resolveVariables(subContent, item, isCopying)).join("");
    });

    // 2. Process Variables
    return processedText.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) => {
        const isFilled = variables[name] !== undefined && variables[name] !== "";
        // User wants {value} in UI to stand out
        const displayValue = isFilled ? variables[name] : match;
        const copyValue = isFilled ? variables[name] : match;

        if (isCopying) return copyValue;

        return isFilled
            ? `<span class="bg-emerald-50 text-emerald-700 px-1 rounded font-bold border border-dashed border-emerald-300 font-mono text-[0.85em]">${displayValue}</span>`
            : `<span class="bg-amber-50 text-amber-700 px-1 rounded border border-dashed border-amber-300 font-mono text-[0.85em] font-bold">${displayValue}</span>`;
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
        const listMatch = line.match(/^(\s*)([0-9a-zA-Z]+|\*|-)[\.\)] (.*$)/);

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
