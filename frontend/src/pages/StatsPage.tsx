import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Select, Table, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { statsApi } from '../api/stats';

const { Title, Text } = Typography;
const COLORS = ['#007AFF', '#FF9500', '#34C759', '#FF3B30', '#AF52DE', '#FF2D55', '#5856D6', '#00C7BE'];

export default function StatsPage() {
  const [trendDays, setTrendDays] = useState(7);
  const [trends, setTrends] = useState<any[]>([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    statsApi.overview().then(({ data }) => setOverview(data.data || data)).catch(() => {});
    statsApi.subjectsBreakdown().then(({ data }) => setSubjectBreakdown(data.data || data)).catch(() => {});
  }, []);

  useEffect(() => {
    statsApi.trends(trendDays).then(({ data }) => setTrends(data.data || data)).catch(() => {});
  }, [trendDays]);

  const ov = overview || {};

  return (
    <div>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>数据统计</Title>

      {/* Overview cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: '总错题数', value: ov.total ?? '--' },
          { label: '总作答次数', value: ov.total_attempts ?? '--' },
          { label: '总体正确率', value: ov.accuracy != null ? `${ov.accuracy}%` : '--' },
          { label: '今日待复习', value: ov.today_pending ?? '--' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card className="card-elevated" style={{ borderRadius: 14, textAlign: 'center' }}>
              <Text className="text-secondary" style={{ fontSize: 13 }}>{s.label}</Text>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Trend chart */}
      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}
        title={<Text strong>正确率趋势</Text>}
        extra={<Select value={trendDays} onChange={setTrendDays} size="small" style={{ width: 120 }}
          options={[{ label: '近 7 天', value: 7 }, { label: '近 30 天', value: 30 }]} />}>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#007AFF" strokeWidth={2} dot={{ r: 3 }} name="正确率" />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty description="暂无数据" />}
      </Card>

      <Row gutter={[16, 16]}>
        {/* Pie chart */}
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 14 }} title={<Text strong>学科错题分布</Text>}>
            {(subjectBreakdown || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={subjectBreakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, total }) => `${name} ${total}`}>
                    {subjectBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
        {/* Bar chart */}
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 14 }} title={<Text strong>各学科正确率</Text>}>
            {(subjectBreakdown || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={subjectBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="accuracy" name="正确率" radius={[6, 6, 0, 0]}>
                    {subjectBreakdown.map((s, i) => <Cell key={i} fill={s.color || COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
      </Row>

      {/* Subjects table */}
      <Card className="card-elevated" style={{ borderRadius: 14, marginTop: 16 }} title={<Text strong>学科详情</Text>}>
        <Table rowKey="subject_id" dataSource={subjectBreakdown} pagination={false} size="small"
          columns={[
            { title: '学科', dataIndex: 'name', render: (name: string, r: any) => (
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: r.color, marginRight: 6 }} />{name}</span>
            )},
            { title: '错题数', dataIndex: 'total' },
            { title: '正确率', dataIndex: 'accuracy', render: (v: number) => `${v}%` },
            { title: '待复习', dataIndex: 'pending' },
          ]} />
      </Card>
    </div>
  );
}
