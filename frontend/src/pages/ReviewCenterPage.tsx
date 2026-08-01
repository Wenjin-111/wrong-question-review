import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Select, InputNumber, Button, Space, message, Tag, Pagination } from 'antd';
import {
  PlayCircleOutlined, HistoryOutlined, RightCircleOutlined, StopOutlined,
  CheckSquareOutlined, ThunderboltOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { subjectsApi } from '../api/subjects';
import { tagsApi } from '../api/tags';
import { reviewApi } from '../api/review';
import type { Subject, Tag as TagType } from '../types';

const { Title, Text } = Typography;

interface SessionItem {
  id: number;
  review_mode: string;
  total_count: number;
  correct_count: number;
  wrong_count: number;
  current_index: number;
  is_finished: boolean;
  started_at: string;
  finished_at: string | null;
}

type ActiveMode = 'select' | 'free' | 'spaced' | null;

export default function ReviewCenterPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [order, setOrder] = useState<'random' | 'created_at_desc'>('random');
  const [limit, setLimit] = useState<number | null>(20);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionPage, setSessionPage] = useState(1);
  const [resuming, setResuming] = useState<number | null>(null);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    tagsApi.list().then(({ data }) => setTags(data)).catch(() => {});
  }, []);

  useEffect(() => { fetchSessions(sessionPage); }, [sessionPage]);

  const fetchSessions = (page = 1) => {
    reviewApi.listSessions({ page, page_size: 6 }).then(({ data }) => {
      const d = (data as any).data || data;
      setSessions(d.items || []);
      setSessionsTotal(d.total || 0);
    }).catch(() => {});
  };

  const startReview = async (mode: 'free' | 'spaced') => {
    if (selectedSubjects.length === 0) {
      message.warning('请至少选择一个学科');
      return;
    }
    setLoading(true);
    try {
      const { data } = await reviewApi.createSession({
        review_mode: mode,
        subject_ids: selectedSubjects,
        tag_ids: selectedTags,
        limit: limit || 100,
        order,
      });
      navigate('/review/session', { state: { session: data.data || data } });
    } catch (err: any) {
      message.error(err.response?.data?.detail || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const resumeReview = async (sessionId: number) => {
    setResuming(sessionId);
    try {
      const { data } = await reviewApi.resumeSession(sessionId);
      const d = data.data || data;
      navigate('/review/session', { state: { session: d, resumedData: d } });
    } catch (err: any) {
      message.error(err.response?.data?.detail || '恢复失败');
    } finally {
      setResuming(null);
    }
  };

  const abandonSession = async (sessionId: number) => {
    const prev = sessions;
    setSessions((ss) => ss.map((s) => s.id === sessionId ? { ...s, is_finished: true } : s));
    try {
      await reviewApi.finishSession(sessionId);
    } catch {
      setSessions(prev);
      message.error('操作失败');
    }
  };

  const modeLabel = (m: string) => {
    if (m === 'spaced') return '遗忘曲线';
    if (m === 'select') return '选题';
    return '自由';
  };

  const modeCards = [
    {
      key: 'select' as ActiveMode,
      icon: <CheckSquareOutlined style={{ fontSize: 28, color: '#6B5BA5' }} />,
      title: '选题重做',
      desc: '手动勾选题目，精准挑选需要重做的错题',
      color: '#6B5BA5',
      bg: 'var(--purple-05)',
    },
    {
      key: 'free' as ActiveMode,
      icon: <ThunderboltOutlined style={{ fontSize: 28, color: 'var(--blue-ink)' }} />,
      title: '自由模式',
      desc: '按学科和标签筛选，随机或按顺序练习',
      color: 'var(--blue-ink)',
      bg: 'var(--blue-ink-04)',
    },
    {
      key: 'spaced' as ActiveMode,
      icon: <ClockCircleOutlined style={{ fontSize: 28, color: 'var(--amber)' }} />,
      title: '遗忘曲线模式',
      desc: 'FSRS 智能调度算法，根据每次答题表现动态调整复习间隔',
      color: 'var(--amber)',
      bg: 'var(--amber-06)',
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Left — mode selection + config */}
      <div style={{ flex: 1 }}>
        <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 20 }}>重做中心</Title>

        {/* Mode cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {modeCards.map((m) => {
            const isActive = activeMode === m.key;
            return (
              <Card
                key={m.key}
                hoverable
                onClick={() => {
                  if (m.key === 'select') {
                    navigate('/review/select');
                    return;
                  }
                  setActiveMode(isActive ? null : m.key);
                  setSelectedSubjects([]);
                  setSelectedTags([]);
                }}
                className="card-elevated"
                style={{
                  borderRadius: 10,
                  cursor: m.key === 'select' ? 'pointer' : 'pointer',
                  border: isActive ? `2px solid ${m.color}` : '1px solid var(--ink-alpha-08)',
                  background: isActive ? m.bg : 'var(--paper-card)',
                  transition: 'all 0.2s',
                }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 10,
                    background: m.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16, color: 'var(--ink)', display: 'block' }}>
                      {m.title}
                      {isActive && <span style={{ fontSize: 12, color: m.color, marginLeft: 8, fontWeight: 400 }}>已选择</span>}
                    </Text>
                    <Text className="text-secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>{m.desc}</Text>
                  </div>
                  {m.key !== 'select' && (
                    <RightCircleOutlined style={{
                      color: isActive ? m.color : 'var(--ink-tertiary)',
                      fontSize: 18,
                      transform: isActive ? 'rotate(90deg)' : 'none',
                      transition: 'all 0.2s',
                    }} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Config form — shown when free or spaced mode is active */}
        {activeMode && activeMode !== 'select' && (
          <>
            <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 14 }}>选择题库</Text>
              <div style={{ marginBottom: 14 }}>
                <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>学科（必选）</Text>
                <Select mode="multiple" placeholder="选择学科" style={{ width: '100%' }}
                  value={selectedSubjects} onChange={setSelectedSubjects}
                  options={subjects.map((s) => ({ label: s.name, value: s.id }))} />
              </div>
              <div>
                <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>标签（可选）</Text>
                <Select mode="multiple" placeholder="不限标签" style={{ width: '100%' }} allowClear
                  value={selectedTags} onChange={setSelectedTags}
                  options={tags.map((t) => ({ label: t.name, value: t.id }))} />
              </div>
            </Card>

            <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 14 }}>练习设置</Text>

              {activeMode === 'free' && (
                <div style={{ marginBottom: 14 }}>
                  <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>题目顺序</Text>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      type={order === 'random' ? 'primary' : 'default'}
                      onClick={() => setOrder('random')}
                      style={{ borderRadius: 8 }}
                    >
                      随机打乱
                    </Button>
                    <Button
                      type={order === 'created_at_desc' ? 'primary' : 'default'}
                      onClick={() => setOrder('created_at_desc')}
                      style={{ borderRadius: 8 }}
                    >
                      按录入顺序
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>数量限制</Text>
                <InputNumber min={1} max={100} value={limit} onChange={(v) => setLimit(v)} placeholder="不填=全部" style={{ width: 160 }} />
                <Text className="text-tertiary" style={{ fontSize: 12, marginLeft: 8 }}>不填则全部符合条件的题目</Text>
              </div>
            </Card>

            <Button
              type="primary" size="large" icon={<PlayCircleOutlined />} block
              loading={loading}
              onClick={() => startReview(activeMode)}
              style={{
                height: 48, fontSize: 16, borderRadius: 10, fontWeight: 600,
                background: activeMode === 'spaced' ? 'var(--amber)' : 'var(--blue-ink)',
                borderColor: activeMode === 'spaced' ? 'var(--amber)' : 'var(--blue-ink)',
              }}
            >
              {activeMode === 'spaced' ? '开始遗忘曲线复习' : '开始自由重做'}
            </Button>
          </>
        )}
      </div>

      {/* Right — session history */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <HistoryOutlined style={{ color: 'var(--ink-secondary)' }} />
          <Text strong style={{ fontSize: 15 }}>练习记录</Text>
        </div>

        {sessions.length === 0 ? (
          <Card className="card-elevated" style={{ borderRadius: 10, textAlign: 'center', padding: 32 }}>
            <Text className="text-tertiary" style={{ fontSize: 13 }}>暂无练习记录</Text>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 160px)', overflow: 'auto' }}>
            {sessions.map((s) => (
              <Card key={s.id} className="card-elevated" style={{ borderRadius: 10 }}
                bodyStyle={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <Space size={4}>
                      <Tag color={s.is_finished ? 'default' : 'blue'} style={{ fontSize: 11, lineHeight: '18px' }}>
                        {s.is_finished ? '已完成' : '进行中'}
                      </Tag>
                      <Tag style={{ fontSize: 11, lineHeight: '18px' }}>{modeLabel(s.review_mode)}</Tag>
                    </Space>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Text className="text-secondary" style={{ fontSize: 12 }}>
                    {s.is_finished
                      ? `${s.correct_count}对 / ${s.wrong_count}错 · ${s.total_count}题`
                      : `进度 ${s.current_index}/${s.total_count} · ${s.correct_count}对${s.wrong_count}错`
                    }
                  </Text>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text className="text-tertiary" style={{ fontSize: 11 }}>
                    {dayjs(s.started_at).format('MM-DD HH:mm')}
                  </Text>
                  <Space size={4}>
                    {s.is_finished ? (
                      <Button type="text" size="small"
                        onClick={() => navigate('/review/result', { state: { session_id: s.id } })}
                        style={{ color: 'var(--blue-ink)', fontSize: 12, padding: '0 4px' }}>
                        查看结果
                      </Button>
                    ) : (
                      <Button type="primary" size="small" icon={<RightCircleOutlined />}
                        loading={resuming === s.id}
                        onClick={() => resumeReview(s.id)}
                        style={{ borderRadius: 8, fontSize: 12, height: 28 }}>
                        继续练习
                      </Button>
                    )}
                    <Button
                      size="small"
                      danger={!s.is_finished}
                      icon={<StopOutlined />}
                      disabled={s.is_finished}
                      onClick={() => abandonSession(s.id)}
                      style={{ borderRadius: 8, fontSize: 12, height: 28, opacity: s.is_finished ? 0.35 : 1 }}
                    >
                      结束
                    </Button>
                  </Space>
                </div>
              </Card>
            ))}
          </div>
        )}
        {sessionsTotal > 6 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <Pagination
              current={sessionPage}
              total={sessionsTotal}
              pageSize={6}
              onChange={setSessionPage}
              showTotal={(t) => `共 ${t} 条`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
