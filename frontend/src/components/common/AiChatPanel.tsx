import { useEffect, useState, useRef } from 'react';
import { Button, Input, Typography, Space } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { aiChatApi } from '../../api/aiChat';

const { Text } = Typography;

interface Message {
  role: string;
  content: string;
}

interface Props {
  questionId: number;
  visible: boolean;
  onClose: () => void;
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/<\/li>\n<li>/g, '</li><li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><h([2-4])>/g, '<h$1>').replace(/<\/h([2-4])><\/p>/g, '</h$1>');
  return html;
}

export default function AiChatPanel({ questionId, visible, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      aiChatApi.history(questionId).then(({ data }) => {
        const history = (data.data || data).filter((m: Message) => m.role !== 'system');
        setMessages(history || []);
      }).catch(() => {});
    }
  }, [visible, questionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 100);
  }, [visible]);

  const send = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    setStreaming('');

    try {
      const token = localStorage.getItem('access_token') || '';
      const response = await fetch(`http://localhost:8000/api/questions/${questionId}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const chunk = line.slice(6);
            if (chunk === '[DONE]') break;
            if (chunk.startsWith('[ERROR]')) {
              full += '\n\n[错误: ' + chunk.slice(7) + ']';
              break;
            }
            full += chunk;
            setStreaming(full);
          }
        }
      }

      if (full) {
        setMessages((prev) => [...prev, { role: 'assistant', content: full }]);
        setStreaming('');
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '请求失败，请重试' }]);
      setStreaming('');
    } finally {
      setIsStreaming(false);
    }
  };

  if (!visible) return null;

  return (
    <div style={{ border: '1px solid rgba(60,60,67,0.08)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 420 }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(60,60,67,0.06)', background: 'rgba(242,242,247,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space><RobotOutlined style={{ color: '#007AFF' }} /><Text strong style={{ fontSize: 14 }}>AI 答疑</Text></Space>
        <Button type="text" size="small" onClick={onClose} style={{ color: '#86868B' }}>收起</Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {messages.length === 0 && !isStreaming && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <RobotOutlined style={{ fontSize: 32, color: '#AEAEB2', marginBottom: 8 }} />
            <Text className="text-secondary" style={{ display: 'block', fontSize: 13 }}>针对这道题向 AI 提问，AI 会结合题目上下文为你解答</Text>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 28, height: 28, borderRadius: 14, background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <RobotOutlined style={{ color: '#fff', fontSize: 13 }} />
              </div>
            )}
            <div style={{
              maxWidth: '78%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? '#007AFF' : 'rgba(242,242,247,0.8)',
              color: m.role === 'user' ? '#fff' : '#1D1D1F',
              fontSize: 14, lineHeight: 1.7,
            }}>
              {m.role === 'assistant' ? (
                <div className="ai-message" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  style={{ wordBreak: 'break-word' }} />
              ) : (
                <Text style={{ color: '#fff', fontSize: 14 }}>{m.content}</Text>
              )}
            </div>
            {m.role === 'user' && (
              <div style={{ width: 28, height: 28, borderRadius: 14, background: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <UserOutlined style={{ color: '#86868B', fontSize: 13 }} />
              </div>
            )}
          </div>
        ))}
        {isStreaming && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 13 }} />
            </div>
            <div style={{
              maxWidth: '78%', padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
              background: 'rgba(242,242,247,0.8)', fontSize: 14, lineHeight: 1.7, wordBreak: 'break-word',
            }}>
              {streaming ? (
                <div className="ai-message" dangerouslySetInnerHTML={{ __html: renderMarkdown(streaming) }} />
              ) : (
                <Text className="text-tertiary">思考中...</Text>
              )}
              <span style={{ display: 'inline-block', width: 6, height: 14, background: '#007AFF', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 0.8s infinite' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(60,60,67,0.06)', display: 'flex', gap: 8 }}>
        <Input
          ref={inputRef}
          value={input} onChange={(e) => setInput(e.target.value)}
          onPressEnter={send} placeholder="输入问题..."
          disabled={isStreaming}
          style={{ borderRadius: 20 }}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={send} loading={isStreaming && !streaming} shape="circle" />
      </div>
    </div>
  );
}
