import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, Form, Select, Input, Button, message, Row, Col, Typography, Radio, Checkbox, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { subjectsApi } from '../api/subjects';
import { tagsApi } from '../api/tags';
import { questionsApi, type QuestionData } from '../api/questions';
import { draftApi } from '../api/draft';
import TiptapEditor from '../components/richEditor/TiptapEditor';
import TiptapViewer from '../components/richEditor/TiptapViewer';
import type { Subject, Tag as TagType } from '../types';
import { CameraOutlined, SaveOutlined, FilePdfOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function QuestionAddPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const ocrData = (location.state as any)?.ocrData;
  const draftData = (location.state as any)?.draftData;
  const draftId = (location.state as any)?.draftId;
  const [form] = Form.useForm();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [questionTypes, setQuestionTypes] = useState<{ id: number; name: string }[]>([]);
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [answerType, setAnswerType] = useState<string>('choice');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptions, setCorrectOptions] = useState<string[]>([]);
  const [blanks, setBlanks] = useState<string[]>(['']);
  const [referenceAnswer, setReferenceAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<{ id: number; content: string; updated_at: string }[]>([]);

  useEffect(() => {
    draftApi.list().then(({ data }) => setDrafts(data.data || data || [])).catch(() => {});
  }, []);

  const loadDraft = async (draftId: number) => {
    try {
      const { data } = await draftApi.get(draftId);
      const d = data.data || data;
      if (d.subject_id) form.setFieldValue('subject_id', d.subject_id);
      if (d.question_type_id) { form.setFieldValue('question_type_id', d.question_type_id); handleSubjectChange(d.subject_id); }
      if (d.content) setContent(d.content);
      if (d.answer) {
        try {
          const ans = JSON.parse(d.answer);
          if (ans.options) { setAnswerType('choice'); setOptions(ans.options); setCorrectOptions(ans.correct || []); }
          else if (ans.blanks) { setAnswerType('fill'); setBlanks(ans.blanks); }
          else { setAnswerType('subjective'); setReferenceAnswer(ans.reference || ''); }
        } catch { setAnswerType('subjective'); setReferenceAnswer(d.answer || ''); }
      }
      if (d.explanation) setExplanation(d.explanation);
      if (d.source) form.setFieldValue('source', d.source);
      if (d.tag_ids) form.setFieldValue('tag_ids', d.tag_ids);
      message.success('草稿已加载');
    } catch { message.error('加载草稿失败'); }
  };

  const saveDraft = async () => {
    try {
      await draftApi.save({
        content, answer: buildAnswer(), explanation,
        subject_id: form.getFieldValue('subject_id'),
        question_type_id: form.getFieldValue('question_type_id'),
        source: form.getFieldValue('source'),
        tag_ids: form.getFieldValue('tag_ids'),
      });
      message.success('草稿已保存');
    } catch { message.error('保存草稿失败'); }
  };

  useEffect(() => {
    subjectsApi.list().then(({ data }) => setSubjects(data)).catch(() => {});
    tagsApi.list().then(({ data }) => setTags(data)).catch(() => {});

    if (ocrData) {
      if (ocrData.content) setContent(ocrData.content);
      if (ocrData.answer) {
        try {
          const ans = JSON.parse(ocrData.answer);
          if (ans.options) { setAnswerType('choice'); setOptions(ans.options); setCorrectOptions(ans.correct || []); }
          else if (ans.blanks) { setAnswerType('fill'); setBlanks(ans.blanks); }
          else { setAnswerType('subjective'); setReferenceAnswer(ans.reference || ocrData.answer); }
        } catch { setAnswerType('subjective'); setReferenceAnswer(ocrData.answer); }
      }
      if (ocrData.explanation) setExplanation(ocrData.explanation);
      message.info('AI 解析结果已填入表单，请补充学科、题型等信息后保存');
      window.history.replaceState({}, document.title);
      return;
    }
    if (draftData) {
      if (draftData.content) setContent(draftData.content);
      if (draftData.answer) {
        try {
          const ans = JSON.parse(draftData.answer);
          if (ans.options) { setAnswerType('choice'); setOptions(ans.options); setCorrectOptions(ans.correct || []); }
          else if (ans.blanks) { setAnswerType('fill'); setBlanks(ans.blanks); }
          else { setAnswerType('subjective'); setReferenceAnswer(ans.reference || draftData.answer); }
        } catch { setAnswerType('subjective'); setReferenceAnswer(draftData.answer); }
      }
      if (draftData.explanation) setExplanation(draftData.explanation);
      if (draftData.subject_id) {
        form.setFieldValue('subject_id', draftData.subject_id);
        handleSubjectChange(draftData.subject_id);
        setTimeout(() => form.setFieldValue('question_type_id', draftData.question_type_id), 100);
      }
      if (draftData.source) form.setFieldValue('source', draftData.source);
      if (draftData.tag_ids) form.setFieldValue('tag_ids', draftData.tag_ids);
      if (draftId) draftApi.delete(draftId).catch(() => {});
      window.history.replaceState({}, document.title);
      return;
    }
    if (editId) {
      questionsApi.get(Number(editId)).then(({ data }) => {
        const d = data.data || data;
        form.setFieldsValue({
          subject_id: d.subject_id,
          question_type_id: d.question_type_id,
          source: d.source,
          tag_ids: d.tag_ids,
        });
        setContent(d.content);
        setExplanation(d.explanation || '');
        try {
          const ans = JSON.parse(d.answer);
          if (ans.options) {
            setAnswerType('choice');
            setOptions(ans.options);
            setCorrectOptions(ans.correct || []);
          } else if (ans.blanks) {
            setAnswerType('fill');
            setBlanks(ans.blanks);
          } else {
            setAnswerType('subjective');
            setReferenceAnswer(ans.reference || '');
          }
        } catch {
          setAnswerType('subjective');
          setReferenceAnswer(d.answer || '');
        }
      }).catch(() => message.error('加载题目失败'));
    }
  }, [editId]);

  const handleSubjectChange = (subjectId: number) => {
    const s = subjects.find((x) => x.id === subjectId);
    setQuestionTypes(s?.question_types || []);
    form.setFieldValue('question_type_id', undefined);
  };

  const buildAnswer = (): string => {
    if (answerType === 'choice') {
      const filtered = options.filter((o) => o.trim());
      return JSON.stringify({ options: filtered, correct: correctOptions });
    }
    if (answerType === 'fill') {
      const filtered = blanks.filter((b) => b.trim());
      return JSON.stringify({ blanks: filtered });
    }
    return JSON.stringify({ reference: referenceAnswer });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    const payload: QuestionData = {
      subject_id: values.subject_id,
      question_type_id: values.question_type_id,
      content,
      answer: buildAnswer(),
      explanation: explanation || undefined,
      source: values.source || undefined,
      tag_ids: values.tag_ids || [],
    };
    try {
      if (editId) {
        await questionsApi.update(Number(editId), payload);
        message.success('已更新');
      } else {
        await questionsApi.create(payload);
        message.success('已保存');
      }
      navigate('/questions');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [content, explanation, answerType, options, correctOptions, blanks, referenceAnswer]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
          {editId ? '编辑错题' : '添加错题'}
        </Title>
        <Space>
          <Button icon={<CameraOutlined />} onClick={() => navigate('/questions/ocr')}>OCR 录入</Button>
          <Button icon={<FilePdfOutlined />} onClick={() => navigate('/questions/pdf')}>PDF 导入</Button>
          <Button icon={<SaveOutlined />} onClick={saveDraft}>保存草稿</Button>
          <Button onClick={() => navigate(-1)}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            {editId ? '保存修改' : '确认保存'}
          </Button>
        </Space>
      </div>

      {drafts.length > 0 && !editId && (
        <Card className="card-elevated" size="small" style={{ borderRadius: 14, marginBottom: 16 }}>
          <Text className="text-secondary" style={{ fontSize: 13 }}>恢复草稿：</Text>
          <Space size={8} wrap style={{ marginLeft: 8 }}>
            {drafts.map((d) => (
              <Button key={d.id} size="small" type="link" onClick={() => loadDraft(d.id)}>
                {d.content?.replace(/<[^>]+>/g, '').slice(0, 30) || '(空)'} — {new Date(d.updated_at).toLocaleDateString()}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
            <Text style={{ fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 16 }}>题目信息</Text>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="subject_id" label="学科" rules={[{ required: true, message: '请选择' }]}>
                    <Select placeholder="选择学科" onChange={handleSubjectChange}
                      options={subjects.map((s) => ({ label: s.name, value: s.id }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="question_type_id" label="题型" rules={[{ required: true, message: '请选择' }]}>
                    <Select placeholder="先选学科"
                      options={questionTypes.map((t) => ({ label: t.name, value: t.id }))} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="题目内容" required>
                <TiptapEditor value={content} onChange={setContent} placeholder="输入题目内容..." />
              </Form.Item>

              {/* Answer section */}
              <Divider plain><Text className="text-secondary">正确答案</Text></Divider>

              <Form.Item label="答案类型">
                <Radio.Group value={answerType} onChange={(e) => setAnswerType(e.target.value)}>
                  <Radio.Button value="choice">选择题</Radio.Button>
                  <Radio.Button value="fill">填空题</Radio.Button>
                  <Radio.Button value="subjective">主观题</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {answerType === 'choice' && (
                <div>
                  <Text className="text-secondary" style={{ fontSize: 13 }}>选项列表（点击复选框标记正确答案）</Text>
                  {options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Checkbox checked={correctOptions.includes(String.fromCharCode(65 + i))}
                        onChange={(e) => {
                          const letter = String.fromCharCode(65 + i);
                          setCorrectOptions(e.target.checked ? [...correctOptions, letter] : correctOptions.filter((x) => x !== letter));
                        }} />
                      <b>{String.fromCharCode(65 + i)}.</b>
                      <Input value={opt} onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }} placeholder={`选项 ${String.fromCharCode(65 + i)}`} style={{ flex: 1 }} />
                      {options.length > 2 && (
                        <Button type="text" danger icon={<DeleteOutlined />}
                          onClick={() => { setOptions(options.filter((_, j) => j !== i)); setCorrectOptions(correctOptions.filter((x) => x !== String.fromCharCode(65 + i))); }} />
                      )}
                    </div>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => setOptions([...options, ''])} style={{ marginTop: 8 }} block>
                    添加选项
                  </Button>
                </div>
              )}

              {answerType === 'fill' && (
                <div>
                  {blanks.map((blank, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Text className="text-secondary">空 {i + 1}</Text>
                      <Input value={blank} onChange={(e) => { const b = [...blanks]; b[i] = e.target.value; setBlanks(b); }}
                        placeholder="答案" style={{ flex: 1 }} />
                      {blanks.length > 1 && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setBlanks(blanks.filter((_, j) => j !== i))} />
                      )}
                    </div>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => setBlanks([...blanks, ''])} style={{ marginTop: 8 }} block>添加空位</Button>
                </div>
              )}

              {answerType === 'subjective' && (
                <Form.Item label="参考答案">
                  <TiptapEditor value={referenceAnswer} onChange={setReferenceAnswer} placeholder="参考答案（供自评参考）" />
                </Form.Item>
              )}

              <Form.Item label="解析（选填）">
                <TiptapEditor value={explanation} onChange={setExplanation} placeholder="解题思路、知识点讲解..." />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="source" label="来源">
                    <Input placeholder="如：2024高考数学卷·第5题" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="tag_ids" label="标签">
                    <Select mode="multiple" placeholder="选择标签"
                      options={tags.map((t) => ({ label: t.name, value: t.id }))} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="card-elevated" style={{ borderRadius: 14, position: 'sticky', top: 80 }}
            title={<Text strong>实时预览</Text>}>
            {content ? (
              <TiptapViewer content={content} />
            ) : (
              <Text className="text-tertiary" style={{ fontSize: 14 }}>在左侧输入题目内容后，这里会实时显示预览效果</Text>
            )}
            {explanation && (
              <>
                <Divider />
                <Text strong style={{ fontSize: 13, color: '#007AFF' }}>解析</Text>
                <TiptapViewer content={explanation} />
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
