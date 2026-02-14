import React, { useMemo } from 'react';
import { resolveVariables, parseMarkdown } from '../utils';

const MarkdownRenderer = ({ content, variables = {}, startOffset = 1, continuous = false, tierStyles = [], className = "", onVariableClick }) => {
    const resolved = useMemo(() => resolveVariables(content, variables), [content, variables]);
    const htmlContent = useMemo(() => parseMarkdown(resolved, startOffset, continuous, tierStyles), [resolved, startOffset, continuous, tierStyles]);

    const handleClick = (e) => {
        const target = e.target.closest('[data-variable]');
        if (target && onVariableClick) {
            e.stopPropagation();
            const rect = target.getBoundingClientRect();
            const variablePath = target.getAttribute('data-variable');
            onVariableClick(variablePath, rect);
        }
    };

    return <div onClick={handleClick} className={`markdown-content prose prose-slate max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default MarkdownRenderer;
