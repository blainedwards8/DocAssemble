import { pb } from "$lib/pocketbase.svelte";

/**
 * Interface representing the hierarchical tree structure of a template.
 */
interface TemplateTree {
    globalVariables: string[];
    allVariables: string[];
    components: any[];
}

/**
 * The Template class manages the data, persistence, and parsing logic 
 * for document blueprints. It uses Svelte's $state for reactivity.
 */
export class Template {
    id = $state("");
    title = $state("");
    content = $state("");

    constructor(id: string, title: string, content: string) {
        this.id = id;
        this.title = title;
        this.content = content;
    }

    /**
     * Parses the flat content string into a hierarchical tree.
     * Elements (text, sections, slots, variables) are returned in their 
     * original order of appearance.
     */
    getTree(): TemplateTree {
        const content = this.content;

        /**
         * Recursive parser that scans linearly for sections, slots, and variables
         * to preserve their document order.
         */
        const parse = (text: string): any[] => {
            const components: any[] = [];
            let i = 0;

            while (i < text.length) {
                // Find the next occurrence of any special marker
                const sectionIdx = text.indexOf('<section name="', i);
                const slotIdx = text.indexOf('[[', i);
                const varIdx = text.indexOf('{', i);

                // Filter out -1 indices to find the absolute next element
                const validIndices = [
                    { type: 'section', index: sectionIdx },
                    { type: 'slot', index: slotIdx },
                    { type: 'variable', index: varIdx }
                ].filter(item => item.index !== -1);

                // If no more markers found, push the remaining text as a final block
                if (validIndices.length === 0) {
                    const remaining = text.substring(i);
                    if (remaining) {
                        components.push({ type: 'text', content: remaining });
                    }
                    break;
                }

                // Sort by index to find the nearest match in the string
                validIndices.sort((a, b) => a.index - b.index);
                const next = validIndices[0];

                // 1. Capture any static text BEFORE the marker
                const beforeText = text.substring(i, next.index);
                if (beforeText) {
                    components.push({ type: 'text', content: beforeText });
                }

                // 2. Process the identified element based on its type
                if (next.type === 'section') {
                    const nameStart = next.index + '<section name="'.length;
                    const nameEnd = text.indexOf('"', nameStart);

                    if (nameEnd === -1) {
                        i = nameStart;
                        continue;
                    }

                    const name = text.substring(nameStart, nameEnd);
                    const tagClose = text.indexOf('>', nameEnd) + 1;

                    let depth = 1;
                    let searchIndex = tagClose;
                    let sectionEnd = -1;

                    while (depth > 0 && searchIndex < text.length) {
                        const nextOpen = text.indexOf('<section', searchIndex);
                        const nextClose = text.indexOf('</section>', searchIndex);

                        if (nextClose === -1) break;

                        if (nextOpen !== -1 && nextOpen < nextClose) {
                            depth++;
                            searchIndex = nextOpen + 8;
                        } else {
                            depth--;
                            if (depth === 0) sectionEnd = nextClose;
                            searchIndex = nextClose + 10;
                        }
                    }

                    if (sectionEnd !== -1) {
                        const innerContent = text.substring(tagClose, sectionEnd);
                        components.push({
                            type: 'section',
                            name,
                            children: parse(innerContent)
                        });
                        i = sectionEnd + 10;
                    } else {
                        i = tagClose;
                    }
                } else if (next.type === 'slot') {
                    const endIdx = text.indexOf(']]', next.index);
                    if (endIdx !== -1) {
                        const name = text.substring(next.index + 2, endIdx).trim();
                        components.push({ type: 'slot', name });
                        i = endIdx + 2;
                    } else {
                        i = next.index + 2;
                    }
                } else if (next.type === 'variable') {
                    const endIdx = text.indexOf('}', next.index);
                    if (endIdx !== -1 && endIdx > next.index + 1) {
                        const name = text.substring(next.index + 1, endIdx).trim();
                        components.push({ type: 'variable', name });
                        i = endIdx + 1;
                    } else {
                        i = next.index + 1;
                    }
                }
            }
            return components;
        };

        const treeComponents = parse(content);

        const globalVars = treeComponents
            .filter(c => c.type === 'variable')
            .map(c => c.name);

        const allVars = Array.from(content.matchAll(/\{([^}]+)\}/g))
            .map(m => m[1].trim());

        return {
            globalVariables: [...new Set(globalVars)],
            allVariables: [...new Set(allVars)],
            components: treeComponents
        };
    }

    async save(): Promise<boolean> {
        if (!this.id) return false;
        try {
            await pb.collection("templates").update(this.id, {
                title: this.title,
                content: this.content
            });
            return true;
        } catch (e) {
            console.error("Failed to save template:", e);
            return false;
        }
    }

    static async get(id: string): Promise<Template> {
        const rec = await pb.collection("templates").getOne(id);
        return new Template(rec.id, rec.title, rec.content);
    }

    static async getAll(): Promise<Template[]> {
        const recs = await pb.collection("templates").getFullList();
        return recs.map((rec) => new Template(rec.id, rec.title, rec.content));
    }

    static async create(title: string, content: string): Promise<Template> {
        const rec = await pb.collection("templates").create({ title, content });
        return new Template(rec.id, rec.title, rec.content);
    }

    static async update(id: string, title: string, content: string): Promise<Template> {
        const rec = await pb.collection("templates").update(id, { title, content });
        return new Template(rec.id, rec.title, rec.content);
    }

    static async delete(id: string): Promise<void> {
        await pb.collection("templates").delete(id);
    }
}