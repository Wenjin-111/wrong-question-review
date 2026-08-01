import { useEffect, useState } from 'react';
import { Card, Typography, Form, Input, Button, Upload, Avatar, message, Row, Col, Progress, Collapse, Space, Empty, Tag } from 'antd';
import { UserOutlined, CameraOutlined, LockOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import EChart from '../components/common/EChart';
import { useAuth } from '../store/AuthContext';
import { settingsApi } from '../api/settings';
import { statsApi } from '../api/stats';
import { reviewApi } from '../api/review';
import { getCssVar } from '../utils/themeVars';
import { useTheme } from '../store/ThemeProvider';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const modeLabel = (m: string) => {
  if (m === 'spaced') return '遗忘曲线';
  if (m === 'select') return '选题';
  return '自由';
};

const masteryColor = (v: number) => (v >= 60 ? 'var(--success-green)' : v >= 40 ? 'var(--amber)' : 'var(--red-pen)');

export default function ProfilePage() {
  useTheme(); // 订阅主题（ECharts 颜色需重渲染刷新）
  const { state, login } = useAuth();
  const user = state.user;

  const [overview, setOverview] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [mastery, setMastery] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  const [signature, setSignature] = useState('');
  const [signatureEditing, setSignatureEditing] = useState(false);
  const [signatureSaving, setSignatureSaving] = useState(false);

  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  useEffect(() => {
    statsApi.overview().then(({ data }) => setOverview((data as any).data || data)).catch(() => {});
    statsApi.streak().then(({ data }) => setStreak((data as any).data || data)).catch(() => {});
    statsApi.subjectRetrievability().then(({ data }) => setMastery((data as any).data || data)).catch(() => {});
    statsApi.trends(7).then(({ data }) => setTrends((data as any).data || data)).catch(() => {});
    reviewApi.listSessions({ page: 1, page_size: 5 }).then(({ data }) => {
      const d = (data as any).data || data;
      setRecentSessions(d.items || []);
    }).catch(() => {});
    settingsApi.getSignature().then(({ data }) => setSignature(data.signature ?? '')).catch(() => {});
  }, []);

  const ov = overview || {};
  const st = streak || {};

  const saveSignature = async () => {
    setSignatureSaving(true);
    try {
      await settingsApi.updateSignature(signature);
      setSignatureEditing(false);
      message.success('签名已保存');
    } catch { message.error('保存失败'); }
    finally { setSignatureSaving(false); }
  };

  const trendOption: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      borderColor: 'var(--ink-alpha-12)',
      textStyle: { color: getCssVar('--ink') },
      formatter: (p: any) => `${p[0].axisValue}：${p[0].value}%`,
    },
    grid: { top: 16, left: 40, right: 16, bottom: 24 },
    xAxis: {
      type: 'category',
      data: trends.map((t) => t.date),
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'var(--ink-alpha-15)' } },
      axisLabel: { color: getCssVar('--ink'), fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: getCssVar('--ink-secondary'), fontSize: 11 },
      splitLine: { lineStyle: { color: 'var(--ink-alpha-06)' } },
    },
    series: [{
      type: 'line',
      data: trends.map((t) => t.accuracy),
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: getCssVar('--blue-ink'), width: 2 },
      itemStyle: { color: getCssVar('--blue-ink') },
    }],
  };

  const handleUpload = async (file: File) => {
    try {
      const { data } = await settingsApi.uploadAvatar(file);
      const url = data.avatar_url || (data.data && data.data.avatar_url);
      if (user && url) {
        const updatedUser = { ...user, avatar_url: url };
        const token = localStorage.getItem('access_token') || '';
        const refresh = localStorage.getItem('refresh_token') || '';
        localStorage.setItem('user', JSON.stringify(updatedUser));
        login({ access_token: token, refresh_token: refresh, user: updatedUser });
      }
      message.success('头像已更新');
    } catch (err: any) { message.error(err?.response?.data?.detail || '上传失败'); }
    return false;
  };

  const handleSaveInfo = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await settingsApi.updateUserInfo(values);
      if (user && values.username) {
        const at = localStorage.getItem('access_token');
        const rt = localStorage.getItem('refresh_token');
        if (at && rt) {
          login({ access_token: at, refresh_token: rt, user: { ...user, username: values.username, email: values.email || user.email } });
        }
      }
      message.success('已保存');
    } catch (err: any) { message.error(err.response?.data?.detail || '保存失败'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    const values = await pwdForm.validateFields();
    setPwdSaving(true);
    try {
      await settingsApi.updatePassword(values);
      message.success('密码已修改');
      pwdForm.resetFields();
    } catch (err: any) { message.error(err.response?.data?.detail || '修改失败'); }
    finally { setPwdSaving(false); }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>个人主页</Title>

      {/* 头部：头像 + 用户名 + 签名 */}
      <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16, textAlign: 'center' }}>
        <Upload showUploadList={false} accept="image/*" beforeUpload={handleUpload}>
          <div style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
            <Avatar size={80} src={user?.avatar_url} icon={<UserOutlined />} style={{ backgroundColor: 'var(--blue-ink)' }} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: 14, background: 'var(--blue-ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--paper-card)',
            }}>
              <CameraOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
          </div>
        </Upload>
        <Text strong style={{ fontSize: 20, display: 'block', marginTop: 12 }}>{user?.username}</Text>
        <div style={{ marginTop: 6 }}>
          {signatureEditing ? (
            <Space size={8}>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="写一句学习口号..."
                maxLength={50}
                style={{ width: 240 }}
                onPressEnter={saveSignature}
                autoFocus
              />
              <Button type="primary" size="small" icon={<CheckOutlined />} loading={signatureSaving} onClick={saveSignature} />
              <Button size="small" icon={<CloseOutlined />} onClick={() => { setSignatureEditing(false); setSignature(signature); }} />
            </Space>
          ) : (
            <Space size={8}>
              <Text className="text-secondary" style={{ fontSize: 14 }}>{signature || '写下你的学习口号...'}</Text>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setSignatureEditing(true)} style={{ fontSize: 12 }} />
            </Space>
          )}
        </div>
      </Card>

      {/* 数据小览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: '总错题数', value: ov.total ?? '--' },
          { label: '累计打卡', value: `${st.total_days || 0} 天` },
          { label: '总体正确率', value: ov.accuracy != null ? `${ov.accuracy}%` : '--' },
          { label: '总作答次数', value: ov.total_attempts ?? '--' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card className="card-elevated" style={{ borderRadius: 10, textAlign: 'center' }} bodyStyle={{ padding: '16px 12px' }}>
              <Text className="text-secondary" style={{ fontSize: 13 }}>{s.label}</Text>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* 学科掌握度（FSRS 记忆保留度） */}
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 10, height: '100%' }} title={<Text strong>学科掌握度</Text>}>
            {mastery.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有复习记录" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {mastery.map((s: any) => {
                  const v = Math.round((s.retrievability || 0) * 100);
                  return (
                    <div key={s.subject_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: s.color, marginRight: 6 }} />
                          {s.name}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: 600, color: masteryColor(v) }}>{v}%</Text>
                      </div>
                      <Progress percent={v} size="small" showInfo={false}
                        strokeColor={masteryColor(v)}
                        trailColor="var(--ink-alpha-06)"
                        style={{ marginBottom: 0 }} />
                      <Text className="text-tertiary" style={{ fontSize: 11 }}>
                        已复习 {s.reviewed}/{s.total} 题
                      </Text>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* 最近一周正确率 */}
        <Col xs={24} md={12}>
          <Card className="card-elevated" style={{ borderRadius: 10, height: '100%' }} title={<Text strong>最近一周正确率</Text>}>
            {trends.length > 0 ? (
              <EChart option={trendOption} height={220} />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
          </Card>
        </Col>
      </Row>

      {/* 最近练习 */}
      <Card className="card-elevated" style={{ borderRadius: 10, marginTop: 16 }} title={<Text strong>最近练习</Text>}>
        {recentSessions.length === 0 ? (
          <Text className="text-tertiary">还没有练习记录</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentSessions.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ink-alpha-04)' }}>
                <Space size={8}>
                  <Tag style={{ borderRadius: 4, fontSize: 11, lineHeight: '18px' }}>{modeLabel(s.review_mode)}</Tag>
                  <Text style={{ fontSize: 13 }}>
                    {s.is_finished
                      ? `${s.correct_count} 对 / ${s.wrong_count} 错 · ${s.total_count} 题`
                      : `进行中 ${s.current_index}/${s.total_count}`}
                  </Text>
                </Space>
                <Text className="text-tertiary" style={{ fontSize: 12 }}>
                  {dayjs(s.started_at).format('MM-DD HH:mm')}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 账号管理（折叠） */}
      <Card className="card-elevated" style={{ borderRadius: 10, marginTop: 16 }}>
        <Collapse
          ghost
          style={{ padding: 0 }}
          items={[{
            key: 'account',
            label: <Text strong style={{ fontSize: 15 }}>账号管理</Text>,
            children: (
              <div style={{ paddingTop: 8 }}>
                <Form form={form} layout="vertical" initialValues={{ username: user?.username, email: user?.email }}>
                  <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2, max: 20 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
                    <Input />
                  </Form.Item>
                  <Button type="primary" loading={saving} onClick={handleSaveInfo}>保存修改</Button>
                </Form>
                <div style={{ borderTop: '1px solid var(--border-light)', margin: '16px 0' }} />
                <Form form={pwdForm} layout="vertical">
                  <Form.Item name="old_password" label="旧密码" rules={[{ required: true }]}>
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Form.Item name="new_password" label="新密码" rules={[{ required: true, min: 6 }]}>
                    <Input.Password prefix={<LockOutlined />} />
                  </Form.Item>
                  <Button type="primary" loading={pwdSaving} onClick={handleChangePassword}>修改密码</Button>
                </Form>
              </div>
            ),
          }]}
        />
      </Card>
    </div>
  );
}
