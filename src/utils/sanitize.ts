import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'a'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

// Conversor ligero de Markdown a HTML seguro
export function simpleMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-800 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-slate-900 mt-5 mb-3 border-b border-slate-200 pb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-slate-900 mt-6 mb-4">$1</h1>')
    // Bold & Italic
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="italic text-slate-700">$1</em>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-slate-400 pl-4 py-1 my-2 text-slate-600 italic bg-slate-50">$1</blockquote>')
    // Lists
    .replace(/^\s*\-\s(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 my-1">$1</li>')
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre class="bg-slate-900 text-slate-100 p-3 rounded font-mono text-sm overflow-x-auto my-3"><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/gim, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200">$1</code>')
    // Paragraphs
    .replace(/\n\n/gim, '</p><p class="my-2 leading-relaxed text-slate-700">');

  html = `<p class="my-2 leading-relaxed text-slate-700">${html}</p>`;
  return sanitizeHtml(html);
}
