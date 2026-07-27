import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, Row, Col, Space, Tag } from 'antd';
import { ReloadOutlined, HomeOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { reviewApi } from '../api/review';

const { Title, Text } = Typography;

export default function ReviewResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = (location.state as any) || {};
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (stateData.session_id) {
      reviewApi.getSession(stateData.session_id).then(({ data }) => {
        setSummary(data.data || data);
      }).catch(() => {});
    } else if (stateData.total) {
      setSummary({
        total_count: stateData.total,
        correct_count: stateData.results?.filter((r: any) => r.is_correct).length || 0,
        wrong_count: stateData.results?.filter((r: any) => !r.is_correct).length || 0,
        accuracy: 0,
        questions: [],
      });
    }
  }, []);

  if (!summary) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Title level={4}>练习已完成</Title>
        <Space>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => navigate('/review')}>再来一轮</Button>
          <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>返回首页</Button>
        </Space>
      </div>
    );
  }

  const accuracy = summary.total_count > 0
    ? Math.round((summary.correct_count / summary.total_count) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24, textAlign: 'center' }}>
        练习完成
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: '总题数', value: summary.total_count, color: '#1D1D1F' },
          { label: '正确', value: summary.correct_count, color: '#34C759' },
          { label: '错误', value: summary.wrong_count, color: '#FF3B30' },
          { label: '正确率', value: `${accuracy}%`, color: '#007AFF' },
        ].map((s) => (
          <Col xs={12} sm={6} key={s.label}>
            <Card className="card-elevated" style={{ borderRadius: 14, textAlign: 'center' }}>
              <Text className="text-secondary" style={{ fontSize: 13 }}>{s.label}</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {summary.questions?.length > 0 && (
        <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>作答详情</Text>
          {(summary.questions || []).map((q: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(60,60,67,0.04)' }}>
                {q.is_correct
                  ? <CheckCircleFilled style={{ fontSize: 20, color: '#34C759' }} />
                  : <CloseCircleFilled style={{ fontSize: 20, color: '#FF3B30' }} />
                }
                <div>
                  <Text>{`第 ${i + 1} 题`}</Text>
                  <Text className="text-secondary" style={{ fontSize: 13, display: 'block' }}>{q.content?.replace(/<[^>]+>/g, '').slice(0, 80)}</Text>
                </div>
              </div>
            ))}
        </Card>
      )}

      <div style={{ textAlign: 'center' }}>
        <Space size={16}>
          <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={() => navigate('/review')}
            style={{ borderRadius: 10, fontWeight: 600 }}>
            再来一轮
          </Button>
          <Button size="large" icon={<HomeOutlined />} onClick={() => navigate('/')}
            style={{ borderRadius: 10 }}>
            返回首页
          </Button>
        </Space>
      </div>
    </div>
  );
}
