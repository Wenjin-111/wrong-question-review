import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Typography, Card, Tag, Button, Tooltip, Skeleton } from 'antd';
import { BellOutlined, FireOutlined, CalendarOutlined, TrophyOutlined } from '@ant-design/icons';
import { useAuth } from '../store/AuthContext';
import { statsApi } from '../api/stats';
import { renderMarkdown } from '../utils/markdown';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [notifyGranted, setNotifyGranted] = useState(false);

  useEffect(() => {
    statsApi.dashboard().then(({ data }) => setStats(data.data || data)).catch(() => {});
    statsApi.streak().then(({ data }) => setStreak(data.data || data)).catch(() => {});
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifyGranted(true);
    }
  }, []);

  const requestNotification = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifyGranted(true);
      const pending = stats?.today_pending || 0;
      if (pending > 0) {
        new Notification('错题重做提醒', {
          body: `你今天还有 ${pending} 道题待复习，坚持打卡！`,
          icon: '/favicon.svg',
        });
      }
    }
  };

  const loading = !stats || !streak;
  const d = stats || {};
  const st = streak || {};

  if (loading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 1 }} title style={{ marginBottom: 24, width: 300 }} />
        <Skeleton.Input active size="large" block style={{ height: 100, marginBottom: 16, borderRadius: 14 }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={12} sm={6} key={i}>
              <Skeleton.Input active block style={{ height: 100, borderRadius: 14 }} />
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  // Calendar heatmap: last 90 days in 7 columns
  const recentDates: { date: string; reviewed: boolean }[] = st.recent_dates || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
          欢迎回来，{state.user?.username}
        </Title>
        <Text className="text-secondary">这是你的学习概览</Text>
      </div>

      {/* Streak + pending alert */}
      <Card
        className="card-elevated"
        style={{
          borderRadius: 14, marginBottom: 16,
          background: st.today_reviewed
            ? 'rgba(52,199,89,0.04)'
            : (d.today_pending || 0) > 0
              ? 'rgba(255,149,0,0.06)'
              : 'rgba(242,242,247,0.4)',
          border: st.today_reviewed
            ? '1px solid rgba(52,199,89,0.15)'
            : (d.today_pending || 0) > 0
              ? '1px solid rgba(255,149,0,0.2)'
              : '1px solid rgba(60,60,67,0.06)',
        }}
        bodyStyle={{ padding: '18px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FireOutlined style={{ color: st.current_streak > 0 ? '#FF9500' : '#C7C7CC', fontSize: 18 }} />
                <Text strong style={{ fontSize: 22, color: st.current_streak > 0 ? '#FF9500' : '#86868B' }}>
                  {st.current_streak || 0}
                </Text>
                <Text className="text-secondary" style={{ fontSize: 14 }}>天连续打卡</Text>
              </div>
              <Text className="text-tertiary" style={{ fontSize: 12, marginTop: 2, display: 'block' }}>
                最长连续 {st.longest_streak || 0} 天 · 累计 {st.total_days || 0} 天
              </Text>
            </div>

            <div>
              {st.today_reviewed ? (
                <Tag color="success" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8 }}>今日已打卡 ✓</Tag>
              ) : (d.today_pending || 0) > 0 ? (
                <div>
                  <Text style={{ fontSize: 15, color: '#FF9500', fontWeight: 500 }}>
                    今日待复习 {d.today_pending} 题
                  </Text>
                  <Button type="primary" size="small" onClick={() => navigate('/review')}
                    style={{ marginLeft: 12, borderRadius: 8, background: '#FF9500', borderColor: '#FF9500' }}>
                    去复习
                  </Button>
                </div>
              ) : (
                <Text className="text-secondary" style={{ fontSize: 14 }}>今日无待复习题目</Text>
              )}
            </div>
          </div>

          {!notifyGranted && (
            <Button icon={<BellOutlined />} onClick={requestNotification}
              style={{ borderRadius: 8, fontSize: 13 }}>
              开启复习提醒
            </Button>
          )}
          {notifyGranted && (
            <Tag icon={<BellOutlined />} color="blue" style={{ borderRadius: 8, fontSize: 12, padding: '2px 10px' }}>
              提醒已开启
            </Tag>
          )}
        </div>

        {/* Calendar heatmap */}
        {recentDates.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {recentDates.slice(0, 77).map((d: any) => (
              <Tooltip key={d.date} title={`${d.date} ${d.reviewed ? '已复习' : '未复习'}`}>
                <div style={{
                  width: 12, height: 12, borderRadius: 3,
                  background: d.reviewed
                    ? (() => {
                        const count = recentDates.filter((x: any) => x.reviewed).length;
                        return count > 30 ? '#34C759' : '#AF52DE';
                      })()
                    : 'rgba(60,60,67,0.06)',
                }} />
              </Tooltip>
            ))}
          </div>
        )}
      </Card>

      {/* Stat cards */}
      <Row gutter={[16, 16]}>
        {[
          { label: '错题总数', value: d.total_questions ?? '--', color: '#007AFF', icon: <CalendarOutlined /> },
          { label: '总体正确率', value: d.accuracy != null ? `${d.accuracy}%` : '--', color: '#34C759', icon: <TrophyOutlined /> },
          { label: '总作答次数', value: d.total_attempts ?? '--', color: '#AF52DE', icon: <FireOutlined /> },
          { label: '累计打卡', value: `${st.total_days || 0} 天`, color: '#FF9500', icon: <FireOutlined /> },
        ].map((s) => (
          <Col xs={12} sm={6} key={s.label}>
            <div className="card-elevated" style={{ padding: '20px 24px', borderRadius: 14 }}>
              <Text className="text-secondary" style={{ fontSize: 13 }}>{s.label}</Text>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', marginTop: 4 }}>
                {s.value}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 14 }} title={<Text strong>学科分布</Text>}>
            {(d.subject_distribution || []).length === 0 ? (
              <Text className="text-tertiary">暂无数据</Text>
            ) : (
              (d.subject_distribution || []).map((s: any) => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <Text>{s.name}</Text>
                  <Tag>{s.count} 题</Tag>
                </div>
              ))
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 14 }} title={<Text strong>最近添加</Text>}>
            {(d.recent_questions || []).length === 0 ? (
              <Text className="text-tertiary">还没有错题</Text>
            ) : (
              (d.recent_questions || []).map((q: any) => (
                <div key={q.id} style={{ cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid rgba(60,60,67,0.04)' }}
                  onClick={() => navigate(`/questions/${q.id}`)}>
                  <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.4, maxHeight: 80, overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(q.content || '') }} />
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
