import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Typography, Button, Form, Select, Input, message, Row, Col,
  Tag, Divider, Radio, Checkbox, Progress, Space, Popconfirm, Modal, Empty,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined,
  SplitCellsOutlined, MergeCellsOutlined, CheckCircleFilled, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { subjectsApi } from '../api/subjects';
import { tagsApi } from '../api/tags';
import { questionsApi } from '../api/questions';
import MarkdownEditor from '../components/richEditor/MarkdownEditor';
import type { Subject, Tag as TagType, QuestionType } from '../types';

const { Title, Text } = Typography;

interface RawQuestion {
  question: string;
  answer: string;
  explanation: string;
  type: string;
}

interface BatchQuestion {
  id: string;
  content: string;
  answer: string;
  explanation: string;
  aiType: string;
  saved: boolean;
  saving: boolean;
  // Parsed answer form state
  answerType: 'choice' | 'fill' | 'subjective';
  options: string[];
  correctOptions: string[];
  blanks: string[];
  referenceAnswer: string;
}

let idCounter = 0;
function nextId(): string {
  return `q_${Date.now()}_${++idCounter}`;
}

function parseInitialAnswer(raw: RawQuestion): Pick<
  BatchQuestion,
  'answerType' | 'options' | 'correctOptions' | 'blanks' | 'referenceAnswer'
> {
  const t = raw.type || 'subjective';
  if (t === 'choice') {
    const letters = (raw.answer || '').match(/[A-D]/gi) || [];
    return {
      answerType: 'choice',
      options: ['', '', '', ''],
      correctOptions: [...new Set(letters.map((l) => l.toUpperCase()))],
      blanks: [''],
      referenceAnswer: '',
    };
  }
  if (t === 'fill') {
    return {
      answerType: 'fill',
      options: ['', '', '', ''],
      correctOptions: [],
      blanks: raw.answer ? [raw.answer] : [''],
      referenceAnswer: '',
    };
  }
  return {
    answerType: 'subjective',
    options: ['', '', '', ''],
    correctOptions: [],
    blanks: [''],
    referenceAnswer: raw.answer || '',
  };
}

function buildAnswerJson(q: BatchQuestion): string {
  if (q.answerType === 'choice') {
    return JSON.stringify({ options: q.options, correct: q.correctOptions });
  }
  if (q.answerType === 'fill') {
    return JSON.stringify({ blanks: q.blanks.filter((b) => b.trim()) });
  }
  return JSON.stringify({ reference: q.referenceAnswer });
}

export default function BatchEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { questions?: RawQuestion[]; raw_text?: string } | null;

  const [questions, setQuestions] = useState<BatchQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  // Global settings
  const [globalSubject, setGlobalSubject] = useState<number | undefined>();
  const [globalSource, setGlobalSource] = useState('');
  const [globalTags, setGlobalTags] = useState<number[]>([]);

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    tagsApi.list().then(({ data }) => setTags(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (state?.questions?.length) {
      const list: BatchQuestion[] = state.questions.map((raw) => ({
        id: nextId(),
        content: raw.question || '',
        answer: raw.answer || '',
        explanation: raw.explanation || '',
        aiType: raw.type || 'subjective',
        saved: false,
        saving: false,
        ...parseInitialAnswer(raw),
      }));
      setQuestions(list);
      setSelectedId(list[0].id);
    } else {
      message.warning('未收到题目数据');
      navigate('/questions/pdf', { replace: true });
    }
  }, []);

  const selected = questions.find((q) => q.id === selectedId);
  const savedCount = questions.filter((q) => q.saved).length;
  const totalCount = questions.length;

  const updateQuestion = useCallback((id: string, patch: Partial<BatchQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const handleSubjectChange = (sid: number) => {
    const s = subjects.find((x) => x.id === sid);
    setQuestionTypes(s?.question_types || []);
  };

  const saveOne = async (id: string) => {
    const q = questions.find((x) => x.id === id);
    if (!q) return;

    if (!globalSubject) {
      message.warning('请先选择学科');
      return;
    }
    const typeId = questionTypes.length > 0 ? questionTypes[0].id : undefined;
    if (!typeId) {
      message.warning('该学科下无可用题型');
      return;
    }

    updateQuestion(id, { saving: true });
    try {
      await questionsApi.create({
        subject_id: globalSubject,
        question_type_id: typeId,
        content: q.content,
        answer: buildAnswerJson(q),
        explanation: q.explanation || undefined,
        source: globalSource || undefined,
        tag_ids: globalTags,
      });
      updateQuestion(id, { saved: true, saving: false });
      message.success('已保存');
    } catch (err: any) {
      updateQuestion(id, { saving: false });
      message.error(err.response?.data?.detail || '保存失败');
    }
  };

  const saveAll = async () => {
    if (!globalSubject) {
      message.warning('请先选择学科');
      return;
    }
    const typeId = questionTypes.length > 0 ? questionTypes[0].id : undefined;
    if (!typeId) {
      message.warning('该学科下无可用题型');
      return;
    }

    const unsaved = questions.filter((q) => !q.saved);
    if (unsaved.length === 0) {
      message.info('全部已保存');
      return;
    }

    setSavingAll(true);
    let done = 0;
    for (const q of unsaved) {
      updateQuestion(q.id, { saving: true });
      try {
        await questionsApi.create({
          subject_id: globalSubject,
          question_type_id: typeId,
          content: q.content,
          answer: buildAnswerJson(q),
          explanation: q.explanation || undefined,
          source: globalSource || undefined,
          tag_ids: globalTags,
        });
        updateQuestion(q.id, { saved: true, saving: false });
        done++;
      } catch {
        updateQuestion(q.id, { saving: false });
      }
    }
    setSavingAll(false);
    message.success(`已保存 ${done}/${unsaved.length} 题`);
  };

  // Split: duplicate current, user trims both halves
  const splitQuestion = () => {
    if (!selected) return;
    const idx = questions.findIndex((q) => q.id === selected.id);
    const newQ: BatchQuestion = {
      ...selected,
      id: nextId(),
      saved: false,
      content: '',
      answer: '',
      explanation: '',
    };
    const updated = [...questions];
    updated.splice(idx + 1, 0, newQ);
    setQuestions(updated);
    setSelectedId(newQ.id);
    message.info('已创建拆分题目，请在编辑器中调整内容');
  };

  // Merge: append next question's content to current, remove next
  const mergeWithNext = () => {
    if (!selected) return;
    const idx = questions.findIndex((q) => q.id === selected.id);
    if (idx >= questions.length - 1) {
      message.warning('已是最后一题，无法合并');
      return;
    }
    const nextQ = questions[idx + 1];
    updateQuestion(selected.id, {
      content: `${selected.content}\n\n---\n\n${nextQ.content}`,
      explanation: selected.explanation || nextQ.explanation,
    });
    setQuestions((prev) => prev.filter((q) => q.id !== nextQ.id));
    message.success('已合并');
  };

  const deleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      message.warning('至少保留一道题目');
      return;
    }
    const idx = questions.findIndex((q) => q.id === id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (id === selectedId) {
      const newIdx = Math.min(idx, questions.length - 2);
      setSelectedId(questions.filter((q) => q.id !== id)[newIdx]?.id || '');
    }
  };

  const getAnswerTypeFromTypeName = (name: string): string | null => {
    if (/选择/.test(name)) return 'choice';
    if (/填空/.test(name)) return 'fill';
    if (/简答|问答|主观|论述/.test(name)) return 'subjective';
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions/pdf')}>
            返回
          </Button>
          <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            PDF 批量导入
          </Title>
        </Space>
        <Space>
          <Text className="text-secondary">
            已保存 {savedCount}/{totalCount}
          </Text>
          <Progress
            percent={totalCount > 0 ? Math.round((savedCount / totalCount) * 100) : 0}
            size="small"
            style={{ width: 120, margin: 0 }}
            strokeColor="#34C759"
          />
          <Popconfirm
            title="将用当前全局设置保存所有未保存的题目"
            onConfirm={saveAll}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" icon={<SaveOutlined />} loading={savingAll}>
              一键保存全部
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Global settings */}
      <Card size="small" style={{ borderRadius: 12, marginBottom: 16, background: '#f9f9fb' }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong style={{ fontSize: 13 }}>全局设置：</Text>
          </Col>
          <Col flex="160px">
            <Select
              placeholder="学科（必选）"
              value={globalSubject}
              onChange={(v) => { setGlobalSubject(v); handleSubjectChange(v); }}
              options={subjects.map((s) => ({ label: s.name, value: s.id }))}
              style={{ width: '100%' }}
            />
          </Col>
          <Col flex="160px">
            <Input
              placeholder="来源（如：2024高考数学）"
              value={globalSource}
              onChange={(e) => setGlobalSource(e.target.value)}
            />
          </Col>
          <Col flex="240px">
            <Select
              mode="multiple"
              placeholder="标签"
              value={globalTags}
              onChange={setGlobalTags}
              options={tags.map((t) => ({ label: t.name, value: t.id }))}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* Left: Question list */}
        <Col xs={24} lg={7}>
          <Card
            className="card-elevated"
            style={{ borderRadius: 14, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}
            bodyStyle={{ padding: 0 }}
          >
            {questions.map((q, idx) => (
              <div
                key={q.id}
                onClick={() => { setSelectedId(q.id); handleSubjectChange(globalSubject || 0); }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(60,60,67,0.06)',
                  background: q.id === selectedId ? 'rgba(0,122,255,0.06)' : undefined,
                  borderLeft: q.id === selectedId ? '3px solid #007AFF' : '3px solid transparent',
                  opacity: q.saved ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {q.saved ? (
                    <CheckCircleFilled style={{ color: '#34C759', fontSize: 14 }} />
                  ) : q.saving ? (
                    <Text className="text-secondary" style={{ fontSize: 12 }}>⏳</Text>
                  ) : (
                    <ExclamationCircleOutlined style={{ color: '#FF9500', fontSize: 14 }} />
                  )}
                  <Text strong style={{ fontSize: 13 }}>
                    题目 {idx + 1}
                  </Text>
                  <Tag
                    color={q.answerType === 'choice' ? 'blue' : q.answerType === 'fill' ? 'green' : 'orange'}
                    style={{ fontSize: 11, lineHeight: '18px', marginLeft: 'auto' }}
                  >
                    {q.answerType === 'choice' ? '选择' : q.answerType === 'fill' ? '填空' : '主观'}
                  </Tag>
                </div>
                <Text
                  className="text-secondary"
                  style={{ fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {q.content?.replace(/<[^>]+>/g, '').slice(0, 80) || '(空)'}
                </Text>
              </div>
            ))}
          </Card>
        </Col>

        {/* Right: Edit form */}
        <Col xs={24} lg={17}>
          {selected ? (
            <Card className="card-elevated" style={{ borderRadius: 14 }}>
              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <Button
                  size="small"
                  icon={<SplitCellsOutlined />}
                  onClick={splitQuestion}
                  disabled={selected.saved}
                >
                  拆分
                </Button>
                <Button
                  size="small"
                  icon={<MergeCellsOutlined />}
                  onClick={mergeWithNext}
                  disabled={selected.saved}
                >
                  合并下一题
                </Button>
                <Popconfirm
                  title="确定删除这道题？"
                  onConfirm={() => deleteQuestion(selected.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button size="small" danger icon={<DeleteOutlined />} disabled={selected.saved}>
                    删除
                  </Button>
                </Popconfirm>
                <div style={{ flex: 1 }} />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={selected.saving}
                  onClick={() => saveOne(selected.id)}
                  disabled={selected.saved}
                  ghost={selected.saved}
                >
                  {selected.saved ? '已保存' : '保存当前'}
                </Button>
              </div>

              {/* Question type */}
              <Form.Item label="答案类型" style={{ marginBottom: 12 }}>
                <Radio.Group
                  value={selected.answerType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    updateQuestion(selected.id, {
                      answerType: newType,
                      answer: newType === 'choice' ? '' : newType === 'fill' ? '' : selected.referenceAnswer,
                    });
                  }}
                >
                  <Radio.Button value="choice">选择题</Radio.Button>
                  <Radio.Button value="fill">填空题</Radio.Button>
                  <Radio.Button value="subjective">主观题</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {/* Content */}
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                  题目内容
                </Text>
                <MarkdownEditor
                  value={selected.content}
                  onChange={(v) => updateQuestion(selected.id, { content: v })}
                  placeholder="输入题目内容..."
                />
              </div>

              {/* Answer editor */}
              <Divider plain><Text className="text-secondary">正确答案</Text></Divider>

              {selected.answerType === 'choice' && (
                <div style={{ marginBottom: 16 }}>
                  {selected.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Checkbox
                        checked={selected.correctOptions.includes(String.fromCharCode(65 + i))}
                        onChange={(e) => {
                          const letter = String.fromCharCode(65 + i);
                          const newCorrect = e.target.checked
                            ? [...selected.correctOptions, letter]
                            : selected.correctOptions.filter((x) => x !== letter);
                          updateQuestion(selected.id, { correctOptions: newCorrect });
                        }}
                      />
                      <b>{String.fromCharCode(65 + i)}.</b>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...selected.options];
                          newOpts[i] = e.target.value;
                          updateQuestion(selected.id, { options: newOpts });
                        }}
                        placeholder={`选项 ${String.fromCharCode(65 + i)}`}
                        style={{ flex: 1 }}
                      />
                      {selected.options.length > 2 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            const newOpts = selected.options.filter((_, j) => j !== i);
                            updateQuestion(selected.id, {
                              options: newOpts,
                              correctOptions: selected.correctOptions.filter(
                                (x) => x !== String.fromCharCode(65 + i)
                              ),
                            });
                          }}
                        />
                      )}
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => updateQuestion(selected.id, { options: [...selected.options, ''] })}
                    style={{ marginTop: 8 }}
                    block
                  >
                    添加选项
                  </Button>
                </div>
              )}

              {selected.answerType === 'fill' && (
                <div style={{ marginBottom: 16 }}>
                  {selected.blanks.map((blank, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Text className="text-secondary">空 {i + 1}</Text>
                      <Input
                        value={blank}
                        onChange={(e) => {
                          const b = [...selected.blanks];
                          b[i] = e.target.value;
                          updateQuestion(selected.id, { blanks: b });
                        }}
                        placeholder="答案"
                        style={{ flex: 1 }}
                      />
                      {selected.blanks.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            updateQuestion(selected.id, {
                              blanks: selected.blanks.filter((_, j) => j !== i),
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => updateQuestion(selected.id, { blanks: [...selected.blanks, ''] })}
                    style={{ marginTop: 8 }}
                    block
                  >
                    添加空位
                  </Button>
                </div>
              )}

              {selected.answerType === 'subjective' && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                    参考答案
                  </Text>
                  <MarkdownEditor
                    value={selected.referenceAnswer}
                    onChange={(v) => updateQuestion(selected.id, { referenceAnswer: v })}
                    placeholder="参考答案（供自评参考）"
                  />
                </div>
              )}

              {/* Explanation */}
              <Divider plain><Text className="text-secondary">解析（选填）</Text></Divider>
              <div style={{ marginBottom: 16 }}>
                <MarkdownEditor
                  value={selected.explanation}
                  onChange={(v) => updateQuestion(selected.id, { explanation: v })}
                  placeholder="解题思路、知识点讲解..."
                />
              </div>
            </Card>
          ) : (
            <Card className="card-elevated" style={{ borderRadius: 14, textAlign: 'center', padding: 80 }}>
              <Empty description="请从左侧选择一道题目进行编辑" />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
