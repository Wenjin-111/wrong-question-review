import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Typography, Card, Tag } from 'antd';
import { useAuth } from '../store/AuthContext';
import { statsApi } from '../api/stats';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    statsApi.dashboard().then(({ data }) => setStats(data.data || data)).catch(() => {});
  }, []);

  const d = stats || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
          欢迎回来，{state.user?.username}
        </Title>
        <Text className="text-secondary">这是你的学习概览</Text>
      </div>

      <Row gutter={[16, 16]}>
        {[
          { label: '今日待复习', value: d.today_pending ?? '--', color: '#007AFF' },
          { label: '错题总数', value: d.total_questions ?? '--', color: '#34C759' },
          { label: '总体正确率', value: d.accuracy != null ? `${d.accuracy}%` : '--', color: '#FF9500' },
          { label: '总作答次数', value: d.total_attempts ?? '--', color: '#AF52DE' },
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
                  <Text style={{ fontSize: 13 }}>{q.content?.replace(/<[^>]+>/g, '').slice(0, 60)}</Text>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
