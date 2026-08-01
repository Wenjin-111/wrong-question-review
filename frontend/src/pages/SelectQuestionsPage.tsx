import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Select, Input, Button, Checkbox, Space, Tag, message, Row, Col } from 'antd';
import { PlayCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { subjectsApi } from '../api/subjects';
import { tagsApi } from '../api/tags';
import { questionsApi } from '../api/questions';
import { reviewApi } from '../api/review';
import { renderMarkdown } from '../utils/markdown';
import type { Subject, Tag as TagType } from '../types';

const { Title, Text } = Typography;

interface QuestionCard {
  id: number;
  code: string;
  content: string;
  content_plain: string;
  subject_name: string;
  subject_color: string;
  type_name: string;
  total_attempts: number;
  correct_attempts: number;
  accuracy: number;
}

export default function SelectQuestionsPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [questions, setQuestions] = useState<QuestionCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Filters
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [typeId, setTypeId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<number | undefined>();
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [sort, setSort] = useState('created_at_desc');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    tagsApi.list().then(({ data }) => setTags(data)).catch(() => {});
  }, []);

  // 按题型名合并：同名题型（各学科各一个）归为一类，value 为逗号分隔的 type_id 列表
  const typeOptions = useMemo(() => {
    const map = new Map<string, number[]>();
    subjects.forEach((s) =>
      (s.question_types || []).forEach((t) => {
        const ids = map.get(t.name) || [];
        ids.push(t.id);
        map.set(t.name, ids);
      }),
    );
    return Array.from(map.entries()).map(([name, ids]) => ({
      label: name,
      value: ids.join(','),
    }));
  }, [subjects]);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(value), 400);
  };

  useEffect(() => {
    fetchQuestions();
  }, [subjectId, typeId, tagId, debouncedKeyword, sort]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 200, sort };
      if (subjectId) params.subject_id = String(subjectId);
      if (typeId) params.type_id = String(typeId);
      if (tagId) params.tag_id = String(tagId);
      if (debouncedKeyword.trim()) params.keyword = debouncedKeyword.trim();

      const { data } = await questionsApi.list(params);
      const items = (data as any).items || data.data?.items || [];
      setQuestions(items);
      setSelected(new Set());
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map((q) => q.id)));
    }
  };

  const startReview = async () => {
    if (selected.size === 0) { message.warning('请至少选择一道题'); return; }
    setCreating(true);
    try {
      const { data } = await reviewApi.createSession({
        review_mode: 'select',
        subject_ids: [],
        question_ids: Array.from(selected),
        order: 'created_at_desc',
        limit: selected.size,
      });
      navigate('/review/session', { state: { session: data.data || data } });
    } catch (err: any) {
      message.error(err.response?.data?.detail || '创建失败');
    } finally { setCreating(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <Button type="text" onClick={() => navigate('/review')} style={{ padding: 0 }}>{'< 返回'}</Button>
          <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>选题重做</Title>
        </Space>
        <Space>
          <Text className="text-secondary" style={{ fontSize: 13 }}>
            已选 <Text strong style={{ color: 'var(--blue-ink)', fontSize: 16 }}>{selected.size}</Text> 题
          </Text>
          <Button type="primary" size="large" icon={<PlayCircleOutlined />}
            loading={creating} onClick={startReview} disabled={selected.size === 0}
            style={{ borderRadius: 10, fontWeight: 600 }}>
            开始重做
          </Button>
        </Space>
      </div>

      {/* Filter bar */}
      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}
        bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap size={12}>
          <Select placeholder="学科" allowClear style={{ width: 140 }}
            value={subjectId} onChange={(v) => { setSubjectId(v); setTypeId(undefined); }}
            options={subjects.map((s) => ({ label: s.name, value: s.id }))} />
          <Select placeholder="题型" allowClear style={{ width: 160 }}
            value={typeId} onChange={setTypeId}
            options={typeOptions} />
          <Select placeholder="标签" allowClear style={{ width: 140 }}
            value={tagId} onChange={setTagId}
            options={tags.map((t) => ({ label: t.name, value: t.id }))} />
          <Input prefix={<SearchOutlined />} placeholder="搜索关键词" allowClear style={{ width: 200 }}
            value={keyword} onChange={(e) => handleKeywordChange(e.target.value)}
            onPressEnter={fetchQuestions} />
          <Select value={sort} onChange={setSort} style={{ width: 120 }}
            options={[
              { label: '最新', value: 'created_at_desc' },
              { label: '最早', value: 'created_at_asc' },
            ]} />
          <Button type="link" size="small" onClick={selectAll}>
            {selected.size === questions.length && questions.length > 0 ? '取消全选' : '全选'}
          </Button>
        </Space>
      </Card>

      {/* Question cards grid */}
      <Row gutter={[12, 12]}>
        {questions.map((q) => {
          const isSelected = selected.has(q.id);
          return (
            <Col xs={24} sm={12} lg={8} key={q.id}>
              <Card
                hoverable
                onClick={() => toggleSelect(q.id)}
                className="card-elevated"
                style={{
                  borderRadius: 14, cursor: 'pointer', height: '100%',
                  border: isSelected ? '2px solid var(--blue-ink)' : '1px solid var(--ink-alpha-08)',
                  background: isSelected ? 'var(--blue-ink-02)' : 'var(--paper-card)',
                  transition: 'all 0.15s',
                }}
                bodyStyle={{ padding: '14px 16px' }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Checkbox checked={isSelected} style={{ marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 6 }}>
                      <Space size={4} wrap>
                        <Tag color={q.subject_color || 'blue'} style={{ fontSize: 11, lineHeight: '18px' }}>{q.subject_name}</Tag>
                        <Tag style={{ fontSize: 11, lineHeight: '18px' }}>{q.type_name}</Tag>
                      </Space>
                      {q.code && <Text className="text-tertiary" style={{ fontSize: 11 }}>{q.code}</Text>}
                    </div>
                    <div
                      className="markdown-body"
                      style={{
                        fontSize: 14, lineHeight: 1.6, marginBottom: 8,
                        maxHeight: '2.8em', overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(q.content || q.content_plain || ''),
                      }}
                    />
                    <div style={{ display: 'flex', gap: 16 }}>
                      <Text className="text-secondary" style={{ fontSize: 12 }}>
                        练习 {q.total_attempts} 次
                      </Text>
                      <Text style={{
                        fontSize: 12,
                        color: q.accuracy >= 60 ? 'var(--red-pen)' : q.accuracy > 0 ? 'var(--amber)' : 'var(--ink-secondary)',
                        fontWeight: 500,
                      }}>
                        正确率 {Math.round(q.accuracy * 100) / 100}%
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {!loading && questions.length === 0 && (
        <Card className="card-elevated" style={{ borderRadius: 14, textAlign: 'center', padding: 40 }}>
          <Text className="text-tertiary">暂无符合条件的题目</Text>
        </Card>
      )}
    </div>
  );
}
