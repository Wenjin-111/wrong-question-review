import { useEffect, useState, useRef } from 'react';
import { Card, Typography, Button, Input, Select, Popconfirm, message } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, PlusOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { subjectsApi } from '../api/subjects';
import { questionsApi } from '../api/questions';
import { chatApi } from '../api/chat';
import { renderMarkdown } from '../utils/markdown';
import { streamSSE } from '../utils/sse';

const { Text } = Typography;

interface Message {
  role: string;
  content: string;
}

interface Session {
  id: number;
  question_id: number;
  title: string;
  question_preview: string;
  last_message: string;
  updated_at: string;
}

export default function AIChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSid, setActiveSid] = useState<number | null>(null);
  const [activeQid, setActiveQid] = useState<number | null>(null);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    questionsApi.list({ page_size: 500 }).then(({ data }) => {
      setAllQuestions((data as any).items || []);
    }).catch(() => {});
    fetchSessions();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);

  const fetchSessions = () => {
    chatApi.listSessions().then(({ data }) => setSessions((data.data || data) || [])).catch(() => {});
  };

  const loadSession = async (sid: number) => {
    setActiveSid(sid);
    const session = sessions.find((s) => s.id === sid);
    setActiveQid(session?.question_id ?? null);
    try {
      const { data } = await chatApi.getMessages(sid);
      setMessages((data.data || data) || []);
    } catch { setMessages([]); }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleNewSession = async () => {
    setCreating(true);
    try {
      const { data } = await chatApi.createSession();
      const s = data.data || data;
      fetchSessions();
      setActiveSid(s.id);
      setActiveQid(null);
      setMessages([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch { message.error('创建失败'); }
    finally { setCreating(false); }
  };

  const handleBindQuestion = async (questionId: number | null) => {
    if (!activeSid) return;
    try {
      await chatApi.bindQuestion(activeSid, questionId);
      setActiveQid(questionId);
      setMessages([]);
      fetchSessions();
    } catch { message.error('绑定失败'); }
  };

  const deleteSession = async (sid: number) => {
    try {
      await chatApi.deleteSession(sid);
      if (activeSid === sid) { setActiveSid(null); setMessages([]); }
      fetchSessions();
    } catch { message.error('删除失败'); }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !activeSid) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    setStreaming('');

    await streamSSE(
      `/chat/sessions/${activeSid}/send`,
      { message: userMsg },
      {
        onToken: (full) => setStreaming(full),
        onDone: (full) => {
          if (full) {
            setMessages((prev) => [...prev, { role: 'assistant', content: full }]);
            setStreaming('');
          }
          fetchSessions();
        },
        onError: (err) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: `请求失败: ${err}` }]);
          setStreaming('');
        },
      },
    );

    setIsStreaming(false);
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>
      {/* Left sidebar — session list */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <Button type="primary" icon={<PlusOutlined />} block onClick={handleNewSession} loading={creating}
          style={{ borderRadius: 10, marginBottom: 12, fontWeight: 500, height: 38 }}>
          新建对话
        </Button>
        <Card className="card-elevated" style={{ borderRadius: 14, flex: 1, overflow: 'hidden' }}
          bodyStyle={{ padding: 0, height: '100%', overflow: 'auto' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <MessageOutlined style={{ fontSize: 28, color: '#AEAEB2', marginBottom: 8 }} />
              <Text className="text-secondary" style={{ fontSize: 13, display: 'block' }}>暂无对话</Text>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id}
                onClick={() => loadSession(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') loadSession(s.id); }}
                style={{
                  padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(60,60,67,0.04)',
                  background: activeSid === s.id ? 'rgba(0,122,255,0.06)' : 'transparent',
                  borderLeft: activeSid === s.id ? '3px solid #007AFF' : '3px solid transparent',
                  transition: 'background 0.15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title}
                    </Text>
                    <Text className="text-tertiary" style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {s.last_message || '点击开始对话'}
                    </Text>
                  </div>
                  <Popconfirm title="确定删除？" onConfirm={(e) => { e?.stopPropagation(); deleteSession(s.id); }}
                    onCancel={(e) => e?.stopPropagation()}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, marginLeft: 4 }} />
                  </Popconfirm>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Right — chat area */}
      <div className="card-elevated" style={{ borderRadius: 14, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
        {activeSid ? (
          <>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {messages.length === 0 && !isStreaming ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <RobotOutlined style={{ fontSize: 40, color: '#007AFF', marginBottom: 12 }} />
                  <Text style={{ display: 'block', marginBottom: 4 }}>开始提问吧</Text>
                  <Text className="text-secondary" style={{ fontSize: 13 }}>AI 会结合题目上下文为你解答</Text>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      {m.role === 'assistant' && (
                        <div style={{ width: 26, height: 26, borderRadius: 13, background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                          <RobotOutlined style={{ color: '#fff', fontSize: 12 }} />
                        </div>
                      )}
                      <div style={{
                        maxWidth: '80%', padding: '10px 14px',
                        borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: m.role === 'user' ? '#007AFF' : 'rgba(242,242,247,0.8)',
                        color: m.role === 'user' ? '#fff' : '#1D1D1F', fontSize: 14, lineHeight: 1.7,
                      }}>
                        {m.role === 'assistant'
                          ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} style={{ wordBreak: 'break-word' }} />
                          : <Text style={{ color: '#fff', fontSize: 14 }}>{m.content}</Text>}
                      </div>
                      {m.role === 'user' && (
                        <div style={{ width: 26, height: 26, borderRadius: 13, background: '#E5E5EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                          <UserOutlined style={{ color: '#86868B', fontSize: 12 }} />
                        </div>
                      )}
                    </div>
                  ))}
                  {isStreaming && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 13, background: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                        <RobotOutlined style={{ color: '#fff', fontSize: 12 }} />
                      </div>
                      <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'rgba(242,242,247,0.8)', fontSize: 14, lineHeight: 1.7, wordBreak: 'break-word' }}>
                        {streaming ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(streaming) }} /> : '思考中...'}
                        <span style={{ display: 'inline-block', width: 5, height: 14, background: '#007AFF', marginLeft: 1, verticalAlign: 'middle' }} />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
            <div style={{ padding: '8px 16px 0', borderTop: '1px solid rgba(60,60,67,0.06)' }}>
              <Select
                placeholder="绑定题目（可选）"
                allowClear
                value={activeQid}
                onChange={(v) => handleBindQuestion(v ?? null)}
                onClear={() => handleBindQuestion(null)}
                style={{ width: '100%' }}
                size="small"
                showSearch
                filterOption={(input, option) => (option?.label as string || '').includes(input)}
                options={subjects.flatMap((s: any) => ({
                  label: s.name,
                  title: s.name as string,
                  options: allQuestions.filter((q: any) => q.subject_id === s.id).map((q: any) => ({
                    label: `[${q.code || q.id}] ${(q.content_plain || q.content || '').replace(/<[^>]+>/g, '').slice(0, 50)}`,
                    value: q.id,
                  })),
                }))}
              />
            </div>
            <div style={{ padding: '6px 16px 10px', display: 'flex', gap: 8 }}>
              <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onPressEnter={handleSend} placeholder="输入问题..." disabled={isStreaming}
                style={{ borderRadius: 20 }} />
              <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={isStreaming && !streaming} shape="circle" />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <RobotOutlined style={{ fontSize: 48, color: '#AEAEB2', marginBottom: 16 }} />
              <Text className="text-secondary" style={{ display: 'block', marginBottom: 8 }}>选择左侧对话或创建新对话</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNewSession} loading={creating}>新建对话</Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
