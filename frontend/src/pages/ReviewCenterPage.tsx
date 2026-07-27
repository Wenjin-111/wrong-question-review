import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Select, InputNumber, Button, Radio, Space, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { subjectsApi } from '../api/subjects';
import { tagsApi } from '../api/tags';
import { reviewApi } from '../api/review';
import type { Subject, Tag as TagType } from '../types';

const { Title, Text } = Typography;

export default function ReviewCenterPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [mode, setMode] = useState('free');
  const [order, setOrder] = useState('random');
  const [limit, setLimit] = useState<number | null>(20);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    tagsApi.list().then(({ data }) => setTags(data)).catch(() => {});
  }, []);

  const startReview = async () => {
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

  return (
    <div style={{ maxWidth: 640 }}>
      <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 24 }}>重做中心</Title>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>选择题库</Text>

        <div style={{ marginBottom: 16 }}>
          <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>学科（必选）</Text>
          <Select mode="multiple" placeholder="选择学科" style={{ width: '100%' }}
            value={selectedSubjects} onChange={setSelectedSubjects}
            options={subjects.map((s) => ({ label: s.name, value: s.id }))} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>标签（可选）</Text>
          <Select mode="multiple" placeholder="不限标签" style={{ width: '100%' }} allowClear
            value={selectedTags} onChange={setSelectedTags}
            options={tags.map((t) => ({ label: t.name, value: t.id }))} />
        </div>
      </Card>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 16 }}>练习设置</Text>

        <div style={{ marginBottom: 16 }}>
          <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>重做模式</Text>
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
            <Radio.Button value="free">自由模式</Radio.Button>
            <Radio.Button value="spaced">遗忘曲线模式</Radio.Button>
          </Radio.Group>
          {mode === 'spaced' && (
            <Text className="text-tertiary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              只筛选当前到达复习时间点的题目
            </Text>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>题目顺序</Text>
          <Radio.Group value={order} onChange={(e) => setOrder(e.target.value)}>
            <Radio.Button value="random">随机打乱</Radio.Button>
            <Radio.Button value="created_at_desc">按录入顺序</Radio.Button>
          </Radio.Group>
        </div>

        <div>
          <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>数量限制</Text>
          <InputNumber min={1} max={100} value={limit} onChange={(v) => setLimit(v)} placeholder="不填=全部" style={{ width: 160 }} />
          <Text className="text-tertiary" style={{ fontSize: 12, marginLeft: 8 }}>不填则全部符合条件的题目</Text>
        </div>
      </Card>

      <Button type="primary" size="large" icon={<PlayCircleOutlined />} block loading={loading} onClick={startReview}
        style={{ height: 48, fontSize: 16, borderRadius: 12, fontWeight: 600 }}>
        开始重做
      </Button>
    </div>
  );
}
