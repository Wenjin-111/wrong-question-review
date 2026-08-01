import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Space, Button, Descriptions, Empty, Popconfirm, message, Skeleton } from 'antd';
import { EditOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { questionsApi } from '../api/questions';
import { notesApi } from '../api/notes';
import MarkdownViewer from '../components/common/MarkdownViewer';
import MarkdownEditor from '../components/richEditor/MarkdownEditor';
import dayjs from 'dayjs';

const { Text } = Typography;

interface QuestionDetail {
  id: number;
  content: string;
  answer: string;
  explanation?: string;
  source?: string;
  subject_name: string;
  subject_color: string;
  type_name: string;
  tag_names: string[];
  accuracy: number;
  total_attempts: number;
  correct_attempts: number;
  created_at: string;
  updated_at: string;
}

export default function QuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [notes, setNotes] = useState<{ id: number; content: string; updated_at: string }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const qid = Number(id);

  useEffect(() => {
    if (!id) return;
    questionsApi.get(qid)
      .then(({ data }) => { setQuestion(data.data || data); })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchNotes();
  }, [id]);

  const fetchNotes = () => {
    if (!qid) return;
    notesApi.list(qid).then(({ data }) => setNotes(data.data || data)).catch(() => {});
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setNoteSaving(true);
    try {
      await notesApi.create(qid, newNote);
      setNewNote('');
      fetchNotes();
      message.success('笔记已添加');
    } catch { message.error('添加失败'); }
    finally { setNoteSaving(false); }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editingContent.trim()) return;
    setNoteSaving(true);
    try {
      await notesApi.update(noteId, editingContent);
      setEditingNoteId(null);
      setEditingContent('');
      fetchNotes();
      message.success('笔记已更新');
    } catch { message.error('更新失败'); }
    finally { setNoteSaving(false); }
  };

  const handleDeleteNote = async (noteId: number) => {
    const prev = notes;
    setNotes((ns) => ns.filter((n) => n.id !== noteId));
    try {
      await notesApi.delete(noteId);
    } catch {
      setNotes(prev);
      message.error('删除失败');
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 860 }}>
      <Skeleton.Input active size="small" style={{ marginBottom: 12, width: 100, borderRadius: 8 }} />
      <Skeleton.Input active block style={{ height: 180, marginBottom: 16, borderRadius: 10 }} />
      <Skeleton.Input active block style={{ height: 160, marginBottom: 16, borderRadius: 10 }} />
      <Skeleton.Input active block style={{ height: 140, marginBottom: 16, borderRadius: 10 }} />
      <Skeleton.Input active block style={{ height: 120, borderRadius: 10 }} />
    </div>
  );
  if (!question) return <Empty description="题目不存在" />;

  const renderAnswer = () => {
    try {
      const ans = JSON.parse(question.answer);
      if (ans.options) {
        const hasOptionText = ans.options.some((o: string) => o?.trim());
        if (!hasOptionText && ans.correct?.length > 0) {
          return (
            <div style={{ color: showAnswer ? 'var(--red-pen)' : 'var(--ink)' }}>
              正确答案：{ans.correct.join('、')}
            </div>
          );
        }
        return (
          <div>
            {ans.options.map((o: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              const isCorrect = ans.correct?.includes(letter);
              return (
                <div key={i} style={{ padding: '4px 0', color: showAnswer && isCorrect ? 'var(--red-pen)' : 'var(--ink)', fontWeight: showAnswer && isCorrect ? 600 : 400 }}>
                  {letter}. {o} {showAnswer && isCorrect && '✓'}
                </div>
              );
            })}
          </div>
        );
      }
      if (ans.blanks) {
        return <div>{ans.blanks.map((b: string, i: number) => <Tag key={i} color="blue" style={{ marginRight: 8 }}>{b || `空 ${i + 1}`}</Tag>)}</div>;
      }
      if (ans.reference) {
        return <MarkdownViewer content={ans.reference} />;
      }
    } catch {
      return <MarkdownViewer content={question.answer} />;
    }
    return <MarkdownViewer content={question.answer} />;
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions')} style={{ marginBottom: 12, color: 'var(--ink-secondary)' }}>
        返回错题库
      </Button>

      <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Space size={8} style={{ marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: question.subject_color }} />
              <Text className="text-secondary">{question.subject_name}</Text>
              <Text className="text-tertiary">·</Text>
              <Text className="text-secondary">{question.type_name}</Text>
            </Space>
          </div>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/questions/add?edit=${question.id}`)}>编辑</Button>
        </div>

        <MarkdownViewer content={question.content} />
      </Card>

      <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 16 }}>答案与解析</Text>
          {!showAnswer ? (
            <Button type="primary" onClick={() => setShowAnswer(true)}>显示答案</Button>
          ) : (
            <Button onClick={() => setShowAnswer(false)}>隐藏答案</Button>
          )}
        </div>
        {showAnswer && (
          <>
            <div style={{ background: 'var(--red-pen-05)', padding: 16, borderRadius: 10, marginBottom: 16 }}>
              <Text strong style={{ color: 'var(--red-pen)' }}>正确答案</Text>
              <div style={{ marginTop: 8 }}>{renderAnswer()}</div>
            </div>
            {question.explanation && (
              <div style={{ background: 'var(--blue-ink-04)', padding: 16, borderRadius: 10 }}>
                <Text strong style={{ color: 'var(--blue-ink)' }}>解析</Text>
                <div style={{ marginTop: 8 }}>
                  <MarkdownViewer content={question.explanation} />
                </div>
              </div>
            )}
          </>
        )}
        {!showAnswer && (
          <Text className="text-tertiary" style={{ display: 'block', textAlign: 'center', padding: 24 }}>
            点击"显示答案"查看正确答案和解析
          </Text>
        )}
      </Card>

      {/* Notes */}
      <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>个人笔记</Text>

        <div style={{ marginBottom: 16, padding: 12, background: 'var(--paper-deep-50)', borderRadius: 10 }}>
          <MarkdownEditor value={newNote} onChange={setNewNote} placeholder="写一条笔记..." />
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddNote}
            loading={noteSaving} disabled={!newNote.trim()}
            style={{ marginTop: 8, borderRadius: 8 }}>
            添加笔记
          </Button>
        </div>

        {notes.length === 0 ? (
          <Text className="text-tertiary" style={{ fontSize: 13 }}>暂无笔记</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ padding: 14, background: 'var(--paper-deep-50)', borderRadius: 10 }}>
                {editingNoteId === n.id ? (
                  <div>
                    <MarkdownEditor value={editingContent} onChange={setEditingContent} placeholder="编辑笔记..." />
                    <Space style={{ marginTop: 8 }}>
                      <Button size="small" type="primary" loading={noteSaving}
                        onClick={() => handleUpdateNote(n.id)}
                        style={{ borderRadius: 8 }}>保存</Button>
                      <Button size="small" onClick={() => { setEditingNoteId(null); setEditingContent(''); }}
                        style={{ borderRadius: 8 }}>取消</Button>
                    </Space>
                  </div>
                ) : (
                  <div>
                    <MarkdownViewer content={n.content} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text className="text-tertiary" style={{ fontSize: 11 }}>
                        {dayjs(n.updated_at).format('MM-DD HH:mm')}
                      </Text>
                      <Space size={4}>
                        <Button type="text" size="small" icon={<EditOutlined />}
                          onClick={() => { setEditingNoteId(n.id); setEditingContent(n.content); }}
                          style={{ color: 'var(--blue-ink)', fontSize: 12 }}>编辑</Button>
                        <Popconfirm title="删除这条笔记？" onConfirm={() => handleDeleteNote(n.id)}>
                          <Button type="text" size="small" danger icon={<DeleteOutlined />}
                            style={{ fontSize: 12 }}>删除</Button>
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 12 }}>统计</Text>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="总作答次数">{question.total_attempts}</Descriptions.Item>
          <Descriptions.Item label="正确次数">{question.correct_attempts}</Descriptions.Item>
          <Descriptions.Item label="正确率">{question.total_attempts > 0 ? `${question.accuracy.toFixed(1)}%` : '--'}</Descriptions.Item>
          <Descriptions.Item label="标签">
            <Space size={4}>{question.tag_names?.map((n) => <Tag key={n} style={{ borderRadius: 5 }}>{n}</Tag>)}</Space>
          </Descriptions.Item>
          <Descriptions.Item label="来源">{question.source || '--'}</Descriptions.Item>
          <Descriptions.Item label="录入时间">{dayjs(question.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

    </div>
  );
}
