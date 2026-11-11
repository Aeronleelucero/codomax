import { parseContent } from '../utils/content';
import './ArticleContent.css';

// Renders article text as headings, lists and paragraphs.
// Text is rendered by React (never as raw HTML), so it is safe from injection.
export default function ArticleContent({ content }) {
  const blocks = parseContent(content);

  if (blocks.length === 0) {
    return <p className="prose__empty">Nothing to preview yet. Start writing to see your article here.</p>;
  }

  return (
    <div className="prose">
      {blocks.map((block, index) => {
        // Blocks have no ids; the index is stable because the list is rebuilt
        // from the text on every render and never reordered.
        if (block.type === 'heading') return <h2 key={index}>{block.text}</h2>;
        if (block.type === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
