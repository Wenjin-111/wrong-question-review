import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Space, Button, Descriptions, Empty, Spin } from 'antd';
import { EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { questionsApi } from '../api/questions';
import TiptapViewer from '../components/richEditor/TiptapViewer';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

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

  useEffect(() => {
    if (!id) return;
    questionsApi.get(Number(id))
      .then(({ data }) => { setQuestion(data.data || data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!question) return <Empty description="题目不存在" />;

  const renderAnswer = () => {
    try {
      const ans = JSON.parse(question.answer);
      if (ans.options) {
        const hasOptionText = ans.options.some((o: string) => o?.trim());
        if (!hasOptionText && ans.correct?.length > 0) {
          return (
            <div style={{ color: showAnswer ? '#34C759' : '#1D1D1F' }}>
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
                <div key={i} style={{ padding: '4px 0', color: showAnswer && isCorrect ? '#34C759' : '#1D1D1F', fontWeight: showAnswer && isCorrect ? 600 : 400 }}>
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
        return <TiptapViewer content={ans.reference} />;
      }
    } catch {
      return <Text>{question.answer}</Text>;
    }
    return <Text>{question.answer}</Text>;
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/questions')} style={{ marginBottom: 12, color: '#86868B' }}>
        返回错题库
      </Button>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Space size={8} style={{ marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: question.subject_color }} />
              <Text className="text-secondary">{question.subject_name}</Text>
              <Text className="text-tertiary">·</Text>
              <Text className="text-secondary">{question.type_name}</Text>
            </Space>
            <Title level={4} style={{ fontWeight: 600, marginTop: 4, marginBottom: 16, letterSpacing: '-0.02em' }}>
              {question.content?.replace(/<[^>]+>/g, '').slice(0, 100)}
            </Title>
          </div>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/questions/add?edit=${question.id}`)}>编辑</Button>
        </div>

        <TiptapViewer content={question.content} />
      </Card>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
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
            <div style={{ background: 'rgba(52,199,89,0.06)', padding: 16, borderRadius: 10, marginBottom: 16 }}>
              <Text strong style={{ color: '#34C759' }}>正确答案</Text>
              <div style={{ marginTop: 8 }}>{renderAnswer()}</div>
            </div>
            {question.explanation && (
              <div style={{ background: 'rgba(0,122,255,0.04)', padding: 16, borderRadius: 10 }}>
                <Text strong style={{ color: '#007AFF' }}>解析</Text>
                <div style={{ marginTop: 8 }}>
                  <TiptapViewer content={question.explanation} />
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

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
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
