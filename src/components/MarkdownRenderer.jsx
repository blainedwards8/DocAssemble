import React, { useMemo } from 'react';
import { resolveVariables, parseMarkdown } from '../utils';

const MarkdownRenderer = ({ content, variables = {}, startOffset = 1, continuous = false, tierStyles = [], className = "" }) => {
    const resolved = useMemo(() => resolveVariables(content, variables), [content, variables]);
    const htmlContent = useMemo(() => parseMarkdown(resolved, startOffset, continuous, tierStyles), [resolved, startOffset, continuous, tierStyles]);
    return <div className={`markdown-content prose prose-slate max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default MarkdownRenderer;
