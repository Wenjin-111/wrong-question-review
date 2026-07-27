import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, Progress, Space, Input, Radio, Checkbox, Tag, message } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { reviewApi } from '../api/review';
import TiptapViewer from '../components/richEditor/TiptapViewer';

const { Title, Text } = Typography;

interface QuestionItem {
  id: number;
  content: string;
  answer: string;
  explanation: string;
  question_type: { id: number; name: string };
  subject: { id: number; name: string };
}

export default function ReviewSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = (location.state as any)?.session;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [questions] = useState<QuestionItem[]>(session?.questions || []);
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [evaluated, setEvaluated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  if (!session) { navigate('/review'); return null; }
  const question = questions[currentIdx];
  if (!question) return null;

  const answerData = (() => { try { return JSON.parse(question.answer); } catch { return null; } })();

  const renderUserAnswerText = () => {
    if (!userAnswer) return '(未作答)';
    try {
      const ans = JSON.parse(typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer));
      if (ans.selected?.length) return ans.selected.join(', ');
      if (ans.blanks?.length) return ans.blanks.join(' 、 ');
      if (ans.reference) return ans.reference;
      return JSON.stringify(ans);
    } catch { return String(userAnswer); }
  };

  const renderCorrectAnswerText = () => {
    try {
      const ans = JSON.parse(correctAnswer);
      if (ans.options) return ans.options.map((o: string, i: number) => (
        <div key={i} style={{ color: ans.correct?.includes(String.fromCharCode(65 + i)) ? '#34C759' : '#1D1D1F', fontWeight: ans.correct?.includes(String.fromCharCode(65 + i)) ? 600 : 400 }}>
          {String.fromCharCode(65 + i)}. {o} {ans.correct?.includes(String.fromCharCode(65 + i)) && '✓'}
        </div>
      ));
      if (ans.blanks) return <Space wrap>{ans.blanks.map((b: string, i: number) => <Tag key={i} color="green">{b}</Tag>)}</Space>;
      if (ans.reference) return <TiptapViewer content={ans.reference} />;
      return <Text>{correctAnswer}</Text>;
    } catch { return <Text>{correctAnswer}</Text>; }
  };

  const renderAnswerInput = () => {
    if (answerData?.options) {
      const isMulti = (answerData.correct || []).length > 1;
      const selected = (() => { try { return JSON.parse(userAnswer || '{}').selected || []; } catch { return []; } })();
      return isMulti ? (
        <Checkbox.Group value={selected} onChange={(vals) => setUserAnswer(JSON.stringify({ selected: vals }))}>
          <Space direction="vertical">
            {answerData.options.map((opt: string, i: number) => (
              <Checkbox key={i} value={String.fromCharCode(65 + i)} style={{ fontSize: 15, padding: '4px 0' }}>{opt}</Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ) : (
        <Radio.Group onChange={(e) => setUserAnswer(JSON.stringify({ selected: [e.target.value] }))} value={selected[0]}>
          <Space direction="vertical">
            {answerData.options.map((opt: string, i: number) => (
              <Radio key={i} value={String.fromCharCode(65 + i)} style={{ fontSize: 15, padding: '4px 0' }}>{opt}</Radio>
            ))}
          </Space>
        </Radio.Group>
      );
    }
    if (answerData?.blanks) {
      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {answerData.blanks.map((_: string, i: number) => (
            <Input key={i} placeholder={`空 ${i + 1} 的答案`}
              onChange={(e) => {
                const b = answerData.blanks.map(() => '');
                try { const p = JSON.parse(userAnswer || '{}'); b.splice(0, p.blanks?.length || 0, ...(p.blanks || [])); } catch {}
                b[i] = e.target.value;
                setUserAnswer(JSON.stringify({ blanks: b }));
              }} />
          ))}
        </Space>
      );
    }
    return (
      <Input.TextArea rows={3} placeholder="输入你的答案..."
        value={(() => { try { return JSON.parse(userAnswer || '{}').reference || ''; } catch { return ''; } })()}
        onChange={(e) => setUserAnswer(JSON.stringify({ reference: e.target.value }))} />
    );
  };

  const handleSubmit = async () => {
    if (!userAnswer) { message.warning('请先作答'); return; }
    setSubmitting(true);
    try {
      const { data } = await reviewApi.submitAnswer(session.session_id, {
        question_id: question.id,
        user_answer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
      });
      const res = data.data || data;
      setCorrectAnswer(res.correct_answer);
      setExplanation(res.explanation);
      setSubmitted(true);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '提交失败');
    } finally { setSubmitting(false); }
  };

  const handleEvaluate = async (correct: boolean) => {
    setSubmitting(true);
    try {
      await reviewApi.submitAnswer(session.session_id, {
        question_id: question.id,
        user_answer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
        is_correct: correct,
      });
      setIsCorrect(correct);
      setEvaluated(true);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '提交失败');
    } finally { setSubmitting(false); }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      reviewApi.finishSession(session.session_id);
      setFinished(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setUserAnswer(null);
      setSubmitted(false);
      setEvaluated(false);
      setCorrectAnswer('');
      setExplanation('');
    }
  };

  if (finished) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <CheckCircleFilled style={{ fontSize: 56, color: '#34C759', marginBottom: 16 }} />
        <Title level={4}>练习完成！</Title>
        <Button type="primary" size="large" onClick={() => navigate('/review/result', { state: { session_id: session.session_id } })}
          style={{ borderRadius: 10, marginTop: 16 }}>查看结果</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Progress percent={Math.round(((currentIdx + (evaluated ? 1 : 0)) / questions.length) * 100)}
        format={() => `${currentIdx + (evaluated ? 1 : 0)} / ${questions.length}`}
        strokeColor="#007AFF" trailColor="rgba(60,60,67,0.06)" style={{ marginBottom: 16 }} />

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
        <Space size={8} style={{ marginBottom: 12 }}>
          <Tag color="blue">{question.subject.name}</Tag>
          <Tag>{question.question_type.name}</Tag>
        </Space>
        <TiptapViewer content={question.content} />
      </Card>

      {/* Answer input */}
      {!submitted && (
        <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>你的答案</Text>
          {renderAnswerInput()}
          <div style={{ marginTop: 20 }}>
            <Button type="primary" size="large" block onClick={handleSubmit} loading={submitting}
              style={{ height: 44, borderRadius: 10, fontWeight: 600 }}>提交答案</Button>
          </div>
        </Card>
      )}

      {/* After submit: show both answers */}
      {submitted && !evaluated && (
        <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'rgba(0,122,255,0.04)', padding: 16, borderRadius: 10 }}>
              <Text strong style={{ color: '#007AFF', display: 'block', marginBottom: 8 }}>你的答案</Text>
              <Text>{renderUserAnswerText()}</Text>
            </div>
            <div style={{ background: 'rgba(52,199,89,0.04)', padding: 16, borderRadius: 10 }}>
              <Text strong style={{ color: '#34C759', display: 'block', marginBottom: 8 }}>正确答案</Text>
              <div>{renderCorrectAnswerText()}</div>
            </div>
          </div>
          {explanation && (
            <div style={{ background: 'rgba(242,242,247,0.6)', padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>解析</Text>
              <TiptapViewer content={explanation} />
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ display: 'block', marginBottom: 16 }}>请自行判断对错</Text>
            <Space size={16}>
              <Button type="primary" icon={<CheckCircleFilled />} size="large" loading={submitting}
                onClick={() => handleEvaluate(true)}
                style={{ background: '#34C759', borderColor: '#34C759', borderRadius: 10 }}>我答对了</Button>
              <Button danger icon={<CloseCircleFilled />} size="large" loading={submitting}
                onClick={() => handleEvaluate(false)}
                style={{ borderRadius: 10 }}>我答错了</Button>
            </Space>
          </div>
        </Card>
      )}

      {/* After self-evaluation */}
      {evaluated && (
        <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16, textAlign: 'center' }}>
          {isCorrect ? (
            <>
              <CheckCircleFilled style={{ fontSize: 48, color: '#34C759', marginBottom: 8 }} />
              <Title level={5} style={{ color: '#34C759', margin: 0 }}>回答正确！</Title>
            </>
          ) : (
            <>
              <CloseCircleFilled style={{ fontSize: 48, color: '#FF3B30', marginBottom: 8 }} />
              <Title level={5} style={{ color: '#FF3B30', margin: 0 }}>回答错误</Title>
            </>
          )}
          <div style={{ marginTop: 20 }}>
            <Button type="primary" size="large" onClick={nextQuestion}
              style={{ height: 44, borderRadius: 10, padding: '0 40px', fontWeight: 600 }}>
              {currentIdx + 1 >= questions.length ? '查看结果' : '下一题'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
