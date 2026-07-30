import { useRef, useCallback } from 'react';
import { Button, Space, Upload, message, Tooltip } from 'antd';
import {
  BoldOutlined, ItalicOutlined, OrderedListOutlined, UnorderedListOutlined,
  PictureOutlined, LinkOutlined, FontSizeOutlined, FunctionOutlined,
} from '@ant-design/icons';
import { uploadApi } from '../../api/upload';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function insertAtCursor(textarea: HTMLTextAreaElement, before: string, after: string, placeholder: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const replacement = selected ? before + selected + after : before + placeholder + after;
  textarea.setRangeText(replacement, start, end, 'select');
  if (!selected) {
    textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
  }
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function prependLine(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const value = textarea.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  textarea.setRangeText(prefix, lineStart, lineStart, 'end');
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function MarkdownEditor({ value, onChange, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const wrap = (before: string, after: string, placeholder: string) => {
    const el = textareaRef.current;
    if (el) insertAtCursor(el, before, after, placeholder);
  };

  const linePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (el) prependLine(el, prefix);
  };

  const handleImageUpload = async (file: File) => {
    try {
      const { data } = await uploadApi.image(file);
      wrap(`![`, `](${data.url})`, '图片描述');
    } catch {
      message.error('图片上传失败');
    }
    return false;
  };

  const toolbarItems = [
    { icon: <BoldOutlined />, title: '粗体 (Ctrl+B)', action: () => wrap('**', '**', '粗体') },
    { icon: <ItalicOutlined />, title: '斜体 (Ctrl+I)', action: () => wrap('*', '*', '斜体') },
    { type: 'divider' as const },
    { icon: <FontSizeOutlined />, title: '标题', action: () => linePrefix('## ') },
    { icon: <UnorderedListOutlined />, title: '无序列表', action: () => linePrefix('- ') },
    { icon: <OrderedListOutlined />, title: '有序列表', action: () => linePrefix('1. ') },
    { type: 'divider' as const },
    { icon: <FunctionOutlined />, title: '行内公式 $...$', action: () => wrap('$', '$', 'x^2') },
    { icon: <span style={{ fontSize: 13, fontWeight: 600 }}>$$</span>, title: '块级公式 $$...$$', action: () => wrap('$$\n', '\n$$', 'x^2') },
    { type: 'divider' as const },
    { icon: <LinkOutlined />, title: '链接', action: () => wrap('[', '](url)', '链接文本') },
  ];

  return (
    <div style={{ border: '1px solid rgba(60,60,67,0.10)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
          borderBottom: '1px solid rgba(60,60,67,0.06)',
          background: 'rgba(242,242,247,0.5)',
        }}
      >
        {toolbarItems.map((item, i) => {
          if ('type' in item && item.type === 'divider') {
            return <div key={i} style={{ width: 1, background: 'rgba(60,60,67,0.1)', margin: '0 4px' }} />;
          }
          const btn = item as { icon: React.ReactNode; title: string; action: () => void };
          return (
            <Tooltip title={btn.title} key={i}>
              <Button type="text" size="small" icon={btn.icon} onClick={btn.action}
                style={{ color: '#86868B', borderRadius: 4 }} />
            </Tooltip>
          );
        })}
        <Upload showUploadList={false} accept="image/*" beforeUpload={handleImageUpload}>
          <Tooltip title="图片">
            <Button type="text" size="small" icon={<PictureOutlined />} style={{ color: '#86868B', borderRadius: 4 }} />
          </Tooltip>
        </Upload>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder || '请输入 Markdown 内容...'}
        style={{
          width: '100%', minHeight: 300, maxHeight: 500, padding: '12px 16px',
          fontSize: 14, lineHeight: 1.8, fontFamily: '"Cascadia Code", "Consolas", "SF Mono", monospace',
          border: 'none', outline: 'none', resize: 'vertical', background: '#fff',
          overflow: 'auto',
        }}
      />
    </div>
  );
}
