import { useMemo } from 'react';
import { renderMarkdown } from '../../utils/markdown';

interface Props {
  content: string;
  style?: React.CSSProperties;
}

export default function MarkdownViewer({ content, style }: Props) {
  const html = useMemo(
    () => renderMarkdown(content || ''),
    [content],
  );

  return (
    <div
      className="markdown-body"
      style={{ fontSize: 15, lineHeight: 1.8, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
