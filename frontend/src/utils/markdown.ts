import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

// Unicode Private Use Area markers — never appear in normal text, survive HTML parsing
const M_CODE = '';
const M_MATH = '';
const M_INLINE = '';

function renderDisplayMath(text: string): string {
  try {
    return katex.renderToString(text.trim(), { displayMode: true, throwOnError: false });
  } catch {
    return `<pre>${text}</pre>`;
  }
}

function renderInlineMath(text: string): string {
  try {
    return katex.renderToString(text.trim(), { displayMode: false, throwOnError: false });
  } catch {
    return text;
  }
}

function placehold(kind: string, idx: number): string {
  return `${kind}${idx}`;
}

export function renderMarkdown(text: string): string {
  if (!text) return '';

  // Step 1: Protect fenced code blocks
  const codeBlocks: string[] = [];
  let processed = text.replace(/```[\s\S]*?```/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return placehold(M_CODE, idx);
  });

  // Step 2: $$...$$ display math
  const displayBlocks: string[] = [];
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    const idx = displayBlocks.length;
    displayBlocks.push(renderDisplayMath(formula));
    return placehold(M_MATH, idx);
  });

  // Step 3: $...$ inline math
  const inlineBlocks: string[] = [];
  processed = processed.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, formula) => {
    const idx = inlineBlocks.length;
    inlineBlocks.push(renderInlineMath(formula));
    return placehold(M_INLINE, idx);
  });

  // Step 3.5: Auto-detect LaTeX commands not wrapped in $...$
  // Matches \frac{x}{y}, \sqrt{x}, \ln, \pi, etc.
  // (?<!:) avoids false positives on Windows paths like C:\Windows
  processed = processed.replace(
    /(?<!:)\\[a-zA-Z]{2,}(?:\{[^}]*\}|\^\{[^}]*\}|_\{[^}]*\})*/g,
    (match) => {
      const idx = inlineBlocks.length;
      inlineBlocks.push(renderInlineMath(match));
      return placehold(M_INLINE, idx);
    },
  );

  // Step 4: Render Markdown to HTML
  let html = md.render(processed);

  // Step 5-7: Restore placeholders
  const restore = (marker: string, blocks: string[]) => {
    const pattern = new RegExp(marker + '(\\d+)', 'g');
    html = html.replace(pattern, (_: string, idx: string) => blocks[parseInt(idx)] || '');
  };
  restore(M_MATH, displayBlocks);
  restore(M_INLINE, inlineBlocks);
  restore(M_CODE, codeBlocks);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'a', 'img', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div', 'svg', 'path', 'line',
      'math', 'semantics', 'mrow', 'mfrac', 'msqrt', 'mroot', 'menclose',
      'mi', 'mo', 'mn', 'msup', 'msub', 'msubsup', 'mover', 'munder', 'munderover',
      'mtable', 'mtr', 'mtd',
      'annotation', 'mpadded', 'mphantom', 'mstyle', 'mspace', 'mtext',
    ],
    ALLOWED_ATTR: ['class', 'aria-hidden', 'style', 'href', 'src', 'alt', 'width', 'height', 'target',
      'd', 'viewBox', 'preserveAspectRatio', 'xmlns',
      'x1', 'y1', 'x2', 'y2', 'stroke-width',
    ],
  });
}
