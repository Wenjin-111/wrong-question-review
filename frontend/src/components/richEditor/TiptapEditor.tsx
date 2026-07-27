import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Button, Space, Upload, message } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined,
  OrderedListOutlined, UnorderedListOutlined, AlignLeftOutlined,
  PictureOutlined, UndoOutlined, RedoOutlined,
} from '@ant-design/icons';
import { uploadApi } from '../../api/upload';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || '请输入内容...' }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  const addImage = async (file: File) => {
    try {
      const { data } = await uploadApi.image(file);
      editor.chain().focus().setImage({ src: data.url }).run();
    } catch {
      message.error('图片上传失败');
    }
  };

  return (
    <div style={{ border: '1px solid rgba(60,60,67,0.10)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
          borderBottom: '1px solid rgba(60,60,67,0.06)',
          background: 'rgba(242,242,247,0.5)',
        }}
      >
        {[
          { icon: <BoldOutlined />, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
          { icon: <ItalicOutlined />, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
          { icon: <UnderlineOutlined />, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
          { icon: <StrikethroughOutlined />, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
          { type: 'divider' },
          { icon: <OrderedListOutlined />, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
          { icon: <UnorderedListOutlined />, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
          { type: 'divider' },
          { icon: <UndoOutlined />, action: () => editor.chain().focus().undo().run(), active: false },
          { icon: <RedoOutlined />, action: () => editor.chain().focus().redo().run(), active: false },
        ].map((item, i) => {
          if ('type' in item && item.type === 'divider') {
            return <div key={i} style={{ width: 1, background: 'rgba(60,60,67,0.1)', margin: '0 4px' }} />;
          }
          const btn = item as { icon: React.ReactNode; action: () => void; active: boolean };
          return (
            <Button
              key={i}
              type="text"
              size="small"
              icon={btn.icon}
              onClick={btn.action}
              style={{
                color: btn.active ? '#007AFF' : '#86868B',
                background: btn.active ? 'rgba(0,122,255,0.08)' : 'transparent',
                borderRadius: 4,
              }}
            />
          );
        })}
        <Upload showUploadList={false} accept="image/*" beforeUpload={(file) => { addImage(file); return false; }}>
          <Button type="text" size="small" icon={<PictureOutlined />} style={{ color: '#86868B', borderRadius: 4 }} />
        </Upload>
      </div>
      <EditorContent
        editor={editor}
        style={{
          padding: '12px 16px',
          minHeight: 150,
          maxHeight: 400,
          overflow: 'auto',
          fontSize: 15,
          lineHeight: 1.7,
          outline: 'none',
        }}
      />
    </div>
  );
}
