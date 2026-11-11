// Turns plain article text into simple blocks that React can render safely.
//
// Supported format (kept intentionally small):
//   - A blank line separates blocks.
//   - A block starting with "## " is a heading.
//   - A block where every line starts with "- " is a bullet list.
//   - Anything else is a paragraph.
//
// Because React escapes text automatically, this approach never injects raw HTML.

export function parseContent(text = '') {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith('## ')) {
        return { type: 'heading', text: block.slice(3).trim() };
      }

      const lines = block.split('\n').map((line) => line.trim());
      if (lines.every((line) => line.startsWith('- '))) {
        return { type: 'list', items: lines.map((line) => line.slice(2).trim()) };
      }

      return { type: 'paragraph', text: lines.join(' ') };
    });
}
