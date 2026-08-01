import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Typography, Button, Input, Select, Popconfirm, message } from 'antd';
import { SendOutlined, RobotOutlined, PlusOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import EChart from '../components/common/EChart';
import { subjectsApi } from '../api/subjects';
import { questionsApi } from '../api/questions';
import { chatApi } from '../api/chat';
import { renderMarkdown } from '../utils/markdown';
import { streamSSE } from '../utils/sse';
import { getCssVar } from '../utils/themeVars';

const { Text } = Typography;

// "思考中"音量条动画（模块级常量，引用稳定避免动画重启）
const THINKING_OPTION: echarts.EChartsOption = {
  graphic: {
    elements: [
      {
        type: 'group',
        left: 'center',
        top: 'center',
        children: new Array(7).fill(0).map((_, i) => ({
          type: 'rect',
          x: i * 10,
          shape: { x: 0, y: -5, width: 4, height: 10 },
          style: { fill: getCssVar('--blue-ink') },
          keyframeAnimation: {
            duration: 1000,
            delay: i * 200,
            loop: true,
            keyframes: [
              { percent: 0.5, scaleY: 0.3, easing: 'cubicIn' },
              { percent: 1, scaleY: 1, easing: 'cubicOut' },
            ],
          },
        })),
      },
    ],
  },
};

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
  // 记录当前发送请求所属会话；切换会话后旧流的回调据此丢弃，防止消息串台
  const sendSidRef = useRef<number | null>(null);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    questionsApi.list({ page_size: 200 }).then(({ data }) => {
      setAllQuestions((data as any).items || []);
    }).catch(() => {});
    fetchSessions();
  }, []);

  // 绑定题目下拉选项：Markdown 渲染（公式/图片正常显示）；useMemo 只在题目数据变化时构建一次
  const questionOptions = useMemo(() =>
    subjects.flatMap((s: any) => ({
      label: s.name,
      title: s.name as string,
      options: allQuestions.filter((q: any) => q.subject_id === s.id).map((q: any) => ({
        label: (
          <span
            className="bind-option markdown-body"
            dangerouslySetInnerHTML={{
              __html: `[${q.code || q.id}] ${renderMarkdown(q.content || q.content_plain || '')}`,
            }}
          />
        ),
        searchText: `${q.code || q.id} ${q.content_plain || q.content || ''}`,
        value: q.id,
      })),
    })),
    [subjects, allQuestions],
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streaming]);

  const fetchSessions = () => {
    chatApi.listSessions().then(({ data }) => setSessions((data.data || data) || [])).catch(() => {});
  };

  const loadSession = async (sid: number) => {
    sendSidRef.current = null; // 切换会话：作废进行中的流
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
    sendSidRef.current = null; // 作废进行中的流
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
    sendSidRef.current = null; // 绑定切换：作废进行中的流
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
    const sid = activeSid;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsStreaming(true);
    setStreaming('');
    sendSidRef.current = sid;

    await streamSSE(
      `/chat/sessions/${sid}/send`,
      { message: userMsg },
      {
        onToken: (full) => {
          if (sendSidRef.current !== sid) return;
          setStreaming(full);
        },
        onDone: (full) => {
          if (sendSidRef.current !== sid) return;
          if (full) {
            setMessages((prev) => [...prev, { role: 'assistant', content: full }]);
            setStreaming('');
          }
          fetchSessions();
        },
        onError: (err) => {
          if (sendSidRef.current !== sid) return;
          setMessages((prev) => [...prev, { role: 'assistant', content: `请求失败: ${err}` }]);
          setStreaming('');
        },
      },
    );

    if (sendSidRef.current === sid) setIsStreaming(false);
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 120px)' }}>
      {/* Left sidebar — session list */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <Button type="primary" icon={<PlusOutlined />} block onClick={handleNewSession} loading={creating}
          style={{ borderRadius: 10, marginBottom: 12, fontWeight: 500, height: 38 }}>
          新建对话
        </Button>
        <Card className="card-elevated" style={{ borderRadius: 10, flex: 1, overflow: 'hidden' }}
          bodyStyle={{ padding: 0, height: '100%', overflow: 'auto' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <MessageOutlined style={{ fontSize: 28, color: 'var(--ink-tertiary)', marginBottom: 8 }} />
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
                  padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--ink-alpha-04)',
                  background: activeSid === s.id ? 'var(--blue-ink-06)' : 'transparent',
                  borderLeft: activeSid === s.id ? '3px solid var(--blue-ink)' : '3px solid transparent',
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
      <div className="card-elevated" style={{ borderRadius: 10, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--paper-card)' }}>
        {activeSid ? (
          <>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {messages.length === 0 && !isStreaming ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <RobotOutlined style={{ fontSize: 40, color: 'var(--blue-ink)', marginBottom: 12 }} />
                  <Text style={{ display: 'block', marginBottom: 4 }}>开始提问吧</Text>
                  <Text className="text-secondary" style={{ fontSize: 13 }}>AI 会结合题目上下文为你解答</Text>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    m.role === 'user' ? (
                      <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                        <div style={{
                          maxWidth: '80%', padding: '10px 14px',
                          borderRadius: '14px 14px 4px 14px',
                          background: 'var(--blue-ink-08)',
                        }}>
                          <Text style={{ color: 'var(--ink)', fontSize: 16 }}>{m.content}</Text>
                        </div>
                      </div>
                    ) : (
                      <div key={i} style={{ marginLeft: 38, marginBottom: 14, fontSize: 16, lineHeight: 1.7, wordBreak: 'break-word', color: 'var(--ink)' }}>
                        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                      </div>
                    )
                  ))}
                  {isStreaming && (
                    <div style={{ marginLeft: 38, marginBottom: 14, fontSize: 16, lineHeight: 1.7, wordBreak: 'break-word', color: 'var(--ink)' }}>
                      {streaming ? (
                        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(streaming) }} />
                      ) : (
                        <div style={{ width: 68, height: 12 }}>
                          <EChart option={THINKING_OPTION} height={12} />
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
            <div style={{ padding: '8px 16px 0', borderTop: '1px solid var(--ink-alpha-06)' }}>
              <Select
                placeholder="绑定题目（可选）"
                allowClear
                value={activeQid}
                onChange={(v) => handleBindQuestion(v ?? null)}
                onClear={() => handleBindQuestion(null)}
                style={{ width: '100%' }}
                size="small"
                showSearch
                filterOption={(input, option) => ((option as any)?.searchText || '').toLowerCase().includes(input.toLowerCase())}
                options={questionOptions}
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
              <RobotOutlined style={{ fontSize: 48, color: 'var(--ink-tertiary)', marginBottom: 16 }} />
              <Text className="text-secondary" style={{ display: 'block', marginBottom: 8 }}>选择左侧对话或创建新对话</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNewSession} loading={creating}>新建对话</Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
