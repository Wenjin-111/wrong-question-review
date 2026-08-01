import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Select, Table, Empty, Tag } from 'antd';
import * as echarts from 'echarts';
import EChart from '../components/common/EChart';
import { statsApi } from '../api/stats';
import { getCssVar } from '../utils/themeVars';
import { useTheme } from '../store/ThemeProvider';

const { Title, Text } = Typography;
const cv = (name: string) => getCssVar(name);

export default function StatsPage() {
  useTheme(); // 订阅主题变化，切换时重建 ECharts option
  const COLORS = [cv('--blue-ink'), cv('--amber'), cv('--red-pen'), '#4C8A3D', '#6B5BA5', cv('--red-pen-deep'), '#C77D3C', '#2E8B8B'];
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
          <EChart
            height={280}
            option={{
              tooltip: {
                trigger: 'axis',
                borderColor: cv('--ink-alpha-12'),
                textStyle: { color: cv('--ink') },
                formatter: (p: any) => `${p[0].axisValue}：${p[0].value}%`,
              },
              grid: { top: 24, left: 44, right: 20, bottom: 28 },
              xAxis: {
                type: 'category',
                data: trends.map((t) => t.date),
                boundaryGap: false,
                axisTick: { show: false },
                axisLine: { lineStyle: { color: cv('--ink-alpha-15') } },
                axisLabel: { color: cv('--ink'), fontSize: 12 },
              },
              yAxis: {
                type: 'value',
                max: 100,
                axisLabel: { formatter: '{value}%', color: cv('--ink-secondary'), fontSize: 12 },
                splitLine: { lineStyle: { color: cv('--ink-alpha-06') } },
              },
              series: [{
                type: 'line',
                data: trends.map((t) => t.accuracy),
                symbol: 'triangle',
                symbolSize: 9,
                lineStyle: { color: cv('--blue-ink'), width: 3, type: 'dashed' },
                itemStyle: { borderWidth: 2, borderColor: cv('--red-pen'), color: cv('--paper-card') },
                emphasis: { scale: 1.6 },
              }],
            }}
          />
        ) : <Empty description="暂无数据" />}
      </Card>

      <Row gutter={[16, 16]}>
        {/* Donut chart — 学科错题分布 */}
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 14 }} title={<Text strong>学科错题分布</Text>}>
            {(subjectBreakdown || []).length > 0 ? (
              <EChart
                height={260}
                option={{
                  tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}：${p.value} 题（${p.percent}%）` },
                  legend: { top: '5%', left: 'center', itemHeight: 10, textStyle: { color: cv('--ink') } },
                  series: [{
                    name: '错题数',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    padAngle: 5,
                    itemStyle: { borderRadius: 10, borderColor: cv('--paper-card'), borderWidth: 2 },
                    label: { show: false, position: 'center' },
                    emphasis: {
                      label: {
                        show: true,
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: cv('--ink'),
                        formatter: (p: any) => `${p.name}\n${p.value} 题`,
                      },
                    },
                    labelLine: { show: false },
                    data: subjectBreakdown.map((s) => ({
                      value: s.total,
                      name: s.name,
                      itemStyle: { color: s.color || COLORS[subjectBreakdown.indexOf(s) % COLORS.length] },
                    })),
                  }],
                }}
              />
            ) : <Empty description="暂无数据" />}
          </Card>
        </Col>
        {/* Gradient bar chart — 各学科正确率 */}
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 14 }} title={<Text strong>各学科正确率</Text>}>
            {(subjectBreakdown || []).length > 0 ? (
              <EChart
                height={260}
                onEvents={{
                  click: (params, chart) => {
                    const n = subjectBreakdown.length;
                    const idx = params.dataIndex;
                    chart.dispatchAction({
                      type: 'dataZoom',
                      startValue: Math.max(idx - 1, 0),
                      endValue: Math.min(idx + 1, n - 1),
                    });
                  },
                }}
                option={{
                  tooltip: {
                    trigger: 'axis',
                    borderColor: cv('--ink-alpha-12'),
                    textStyle: { color: cv('--ink') },
                    formatter: (p: any) => `${p[0].name}：${p[0].value}%`,
                  },
                  grid: { top: 16, left: 44, right: 16, bottom: 28 },
                  xAxis: {
                    type: 'category',
                    data: subjectBreakdown.map((s) => s.name),
                    axisTick: { show: false },
                    axisLine: { lineStyle: { color: cv('--ink-alpha-15') } },
                    axisLabel: { color: cv('--ink'), fontSize: 12 },
                  },
                  yAxis: {
                    type: 'value',
                    max: 100,
                    axisLabel: { formatter: '{value}%', color: cv('--ink-secondary'), fontSize: 12 },
                    splitLine: { lineStyle: { color: cv('--ink-alpha-06') } },
                  },
                  dataZoom: [{ type: 'inside' }],
                  series: [{
                    name: '正确率',
                    type: 'bar',
                    showBackground: true,
                    backgroundStyle: { color: cv('--ink-alpha-04'), borderRadius: [6, 6, 0, 0] },
                    data: subjectBreakdown.map((s) => {
                      const base = s.color || COLORS[subjectBreakdown.indexOf(s) % COLORS.length];
                      return {
                        value: s.accuracy,
                        itemStyle: {
                          borderRadius: [6, 6, 0, 0],
                          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${base}66` },
                            { offset: 1, color: base },
                          ]),
                        },
                      };
                    }),
                  }],
                }}
              />
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
            { title: '错题数', dataIndex: 'total', sorter: (a: any, b: any) => a.total - b.total,
              render: (v: number) => <Text style={{ fontWeight: 500 }}>{v}</Text> },
            { title: '正确率', dataIndex: 'accuracy', sorter: (a: any, b: any) => a.accuracy - b.accuracy,
              render: (v: number) => `${v}%` },
            { title: '待复习', dataIndex: 'pending', sorter: (a: any, b: any) => a.pending - b.pending,
              render: (v: number) => v > 0 ? (
                <Tag style={{ color: 'var(--amber-deep)', background: 'var(--amber-12)', borderColor: 'var(--amber-30)', fontWeight: 500 }}>{v} 题</Tag>
              ) : <Text className="text-tertiary">—</Text> },
          ]} />
      </Card>
    </div>
  );
}
