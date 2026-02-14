import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Indent } from "docx";
import { jsPDF } from "jspdf";
import { resolveVariables } from "./utils";

// --- Helpers for List styles ---
const toRoman = (num) => {
    const lookup = { m: 1000, cm: 900, d: 500, cd: 400, c: 100, xc: 90, l: 50, xl: 40, x: 10, ix: 9, v: 5, iv: 4, i: 1 };
    let roman = '';
    for (let i in lookup) { while (num >= lookup[i]) { roman += i; num -= lookup[i]; } }
    return roman;
};
const toAlpha = (num) => String.fromCharCode(96 + num); // 1 = a
const formatNumber = (num, style) => {
    if (style === 'lower-alpha') return `${toAlpha(num)}.`;
    if (style === 'lower-roman') return `${toRoman(num)}.`;
    return `${num}.`;
};

// --- Core Parser: Converts Template to Structured Blocks ---
const parseForExport = (parsedTemplate, variables, sectionListOffsets, disabledSlots, tierStyles) => {
    const blocks = [];

    parsedTemplate.forEach(item => {
        if (disabledSlots && disabledSlots.has(item.id)) return;

        const rawContent = item.type === 'static' ? item.content : (item.value ? item.value.content : `[Missing: ${item.label}]`);
        const text = resolveVariables(rawContent, variables, true);

        // List State
        const startCount = sectionListOffsets[item.id] || 1;
        let counters = [startCount - 1, 0, 0, 0]; // Level 0 starts at offset-1 to pre-increment
        let listStackLevel = -1;

        const lines = text.split('\n');
        lines.forEach(line => {
            if (!line.trim()) return;

            // 1. Headers
            const headerMatch = line.match(/^(#{1,3}) (.*$)/);
            if (headerMatch) {
                blocks.push({ type: 'header', level: headerMatch[1].length, text: headerMatch[2].trim() });
                // Reset list state on header? Usually yes in markdown
                counters = [startCount - 1, 0, 0, 0];
                return;
            }

            // 2. Lists
            const listMatch = line.match(/^(\s*)([0-9a-zA-Z]+|\*|-)[\.\)] (.*$)/);
            if (listMatch) {
                const indent = listMatch[1].length;
                const level = Math.floor(indent / 2);

                // Reset nesting counters if going deeper or shallower
                if (level > listStackLevel) {
                    // Going deeper: reset next level
                    counters[level] = 0;
                }
                listStackLevel = level;

                // Increment counter for this level
                counters[level]++;

                // Format the number/marker
                const style = tierStyles[level] || 'decimal';
                const marker = formatNumber(counters[level], style);

                blocks.push({
                    type: 'list',
                    level,
                    marker,
                    text: listMatch[3].trim().replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") // Strip MD formatting for export 
                });
                return;
            }

            // 3. Paragraphs
            blocks.push({ type: 'text', text: line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1") });
        });
    });
    return blocks;
};

// --- DOCX Export ---
export const generateDocx = async (parsedTemplate, variables, sectionListOffsets, continuousNumbering, tierStyles, disabledSlots) => {
    const blocks = parseForExport(parsedTemplate, variables, sectionListOffsets, disabledSlots, tierStyles);

    const children = [
        new Paragraph({
            children: [new TextRun({ text: "Generated Document", bold: true, size: 32 })],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        })
    ];

    blocks.forEach(block => {
        if (block.type === 'header') {
            const level = block.level === 1 ? HeadingLevel.HEADING_1 : (block.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3);
            children.push(new Paragraph({ text: block.text, heading: level, spacing: { before: 200, after: 100 } }));
        } else if (block.type === 'list') {
            // Indent based on level (720 twips = 0.5 inch per level)
            const indentLeft = 720 + (block.level * 720);
            const hanging = 360;

            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `${block.marker}\t` }), // Tab after number
                    new TextRun({ text: block.text })
                ],
                indent: { left: indentLeft, hanging: hanging }, // Hanging indent for list
                spacing: { after: 0 } // Tight spacing for lists
            }));
        } else if (block.type === 'text') {
            children.push(new Paragraph({ text: block.text, spacing: { after: 100 } }));
        }
    });

    const doc = new Document({ sections: [{ properties: {}, children }] });
    return await Packer.toBlob(doc);
};

// --- PDF Export ---
export const generatePdf = (parsedTemplate, variables, sectionListOffsets, continuousNumbering, tierStyles, disabledSlots) => {
    const blocks = parseForExport(parsedTemplate, variables, sectionListOffsets, disabledSlots, tierStyles);
    const doc = new jsPDF();
    let y = 20; const margin = 20; const width = doc.internal.pageSize.width - 40;

    doc.setFontSize(18); doc.text("Generated Document", width / 2 + margin, y, { align: "center" }); y += 15;
    doc.setFontSize(12);

    blocks.forEach(block => {
        if (y > doc.internal.pageSize.height - 20) { doc.addPage(); y = 20; }

        if (block.type === 'header') {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(block.level === 1 ? 16 : 14);
            doc.text(block.text, margin, y);
            y += 8;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(12);
        } else if (block.type === 'list') {
            const indent = margin + (block.level * 10);
            const prefix = block.marker + " ";
            const lines = doc.splitTextToSize(prefix + block.text, width - (block.level * 10));

            // Draw first line with hanging indent logic? Simplified for PDF:
            doc.text(lines[0], indent, y);
            if (lines.length > 1) {
                lines.slice(1).forEach((l, i) => doc.text(l, indent + 5, y + ((i + 1) * 6))); // indent wrapped lines
                y += (lines.length - 1) * 6;
            }
            y += 6;
        } else if (block.type === 'text') {
            const lines = doc.splitTextToSize(block.text, width);
            doc.text(lines, margin, y);
            y += lines.length * 6 + 2;
        }
    });

    return doc.output("blob");
};

// --- RTF Export ---
export const generateRtf = (parsedTemplate, variables, sectionListOffsets, continuousNumbering, tierStyles, disabledSlots) => {
    const blocks = parseForExport(parsedTemplate, variables, sectionListOffsets, disabledSlots, tierStyles);
    let rtf = "{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Arial;}}\n\\f0\\fs24\n";
    rtf += "\\qc\\b\\fs32 Generated Document\\b0\\fs24\\par\\par\n\\ql ";

    blocks.forEach(block => {
        if (block.type === 'header') {
            const fs = block.level === 1 ? 32 : 28;
            rtf += `\\par\\b\\fs${fs} ${block.text}\\fs24\\b0\\par\n`;
        } else if (block.type === 'list') {
            const indent = (block.level + 1) * 360; // Twips
            rtf += `\\par\\li${indent}\\fi-360 ${block.marker}\\tab ${block.text}\n`;
        } else if (block.type === 'text') {
            rtf += `\\par ${block.text}\\par\n`;
        }
    });
    rtf += "}";
    return new Blob([rtf], { type: "application/rtf" });
};
