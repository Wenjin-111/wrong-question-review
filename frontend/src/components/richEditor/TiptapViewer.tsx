import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface Props {
  content: string;
}

export default function TiptapViewer({ content }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Image, Underline, TextAlign, Link],
    content,
    editable: false,
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-viewer" style={{ fontSize: 15, lineHeight: 1.7 }}>
      <EditorContent editor={editor} />
    </div>
  );
}
