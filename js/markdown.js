/**
 * Silence External V1.0.0 · Zero-dependency Markdown Parser
 * Safe, minimal and fast Markdown -> HTML renderer
 */

export function parseMarkdown(md) {
    if (!md) return '';

    // Normalize newlines
    let src = md.replace(/\r\n/g, '\n');

    // 1. Extract and protect code blocks
    const codeBlocks = [];
    src = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        codeBlocks.push(`<pre><code class="language-${lang || 'plaintext'}">${escaped}</code></pre>`);
        return `@@CODEBLOCK_${index}@@`;
    });

    // 2. Extract and protect inline code
    const inlineCodes = [];
    src = src.replace(/`([^`]+)`/g, (match, code) => {
        const index = inlineCodes.length;
        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        inlineCodes.push(`<code>${escaped}</code>`);
        return `@@INLINECODE_${index}@@`;
    });

    // 3. Headings
    src = src.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    src = src.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    src = src.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    src = src.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 4. Blockquotes
    src = src.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // 5. Bold & Italic
    src = src.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    src = src.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 6. Links [text](url)
    src = src.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 7. Unordered Lists
    const lines = src.split('\n');
    let inList = false;
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const listMatch = line.match(/^[\*\-]\s+(.*)/);
        if (listMatch) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${listMatch[1]}</li>`);
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            processedLines.push(line);
        }
    }
    if (inList) {
        processedLines.push('</ul>');
    }
    src = processedLines.join('\n');

    // 8. Paragraphs
    const paragraphs = src.split(/\n\n+/);
    src = paragraphs.map(p => {
        p = p.trim();
        if (!p) return '';
        if (p.startsWith('<h') || p.startsWith('<ul>') || p.startsWith('<blockquote>') || p.startsWith('@@CODEBLOCK_')) {
            return p;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    // 9. Restore code blocks
    codeBlocks.forEach((block, idx) => {
        src = src.replace(`@@CODEBLOCK_${idx}@@`, block);
    });

    // 10. Restore inline codes
    inlineCodes.forEach((code, idx) => {
        src = src.replace(`@@INLINECODE_${idx}@@`, code);
    });

    return src;
}


