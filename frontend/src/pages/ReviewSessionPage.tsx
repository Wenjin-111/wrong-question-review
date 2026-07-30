import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, Progress, Space, Input, Radio, Checkbox, Tag, message, Drawer, Spin, Statistic } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, StopOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { reviewApi } from '../api/review';
import { questionsApi } from '../api/questions';
import { notesApi } from '../api/notes';
import MarkdownViewer from '../components/common/MarkdownViewer';

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
  const resumedData = (location.state as any)?.resumedData;

  const [currentIdx, setCurrentIdx] = useState(resumedData?.current_index || 0);
  const [questions] = useState<QuestionItem[]>(session?.questions || []);
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [evaluated, setEvaluated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Track completed answers per index for back-navigation
  const [history, setHistory] = useState<Record<number, {
    userAnswer: any;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
    submitted: boolean;
    evaluated: boolean;
  }>>({});
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerNotes, setDrawerNotes] = useState<{ id: number; content: string; updated_at: string }[]>([]);
  const [drawerData, setDrawerData] = useState<{
    content: string;
    answer: string;
    explanation: string;
    source: string;
    tags: { id: number; name: string; color: string }[];
    total_attempts: number;
    correct_attempts: number;
    accuracy: number;
  } | null>(null);

  const openQuestionDetail = async () => {
    setDrawerVisible(true);
    setDrawerLoading(true);
    try {
      const [{ data }, notesRes] = await Promise.all([
        questionsApi.get(question.id),
        notesApi.list(question.id).catch(() => ({ data: [] })),
      ]);
      const d = (data as any).data || data;
      setDrawerData({
        content: d.content || '',
        answer: d.answer || '',
        explanation: d.explanation || '',
        source: d.source || '',
        tags: d.tags || [],
        total_attempts: d.total_attempts || 0,
        correct_attempts: d.correct_attempts || 0,
        accuracy: d.accuracy || 0,
      });
      setDrawerNotes((notesRes as any).data?.data || (notesRes as any).data || []);
    } catch {
      message.error('加载题目详情失败');
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    if (!session) { navigate('/review'); }
  }, [session, navigate]);

  if (!session) return null;
  const question = questions[currentIdx];
  if (!question) return null;

  const answerData = (() => { try { return JSON.parse(question.answer); } catch { return null; } })();

  const renderAnswerForDrawer = (answerJson: string) => {
    try {
      const ans = JSON.parse(answerJson);
      if (ans.options) {
        const hasOptionText = ans.options.some((o: string) => o?.trim());
        if (!hasOptionText && ans.correct?.length > 0) {
          return <Text style={{ color: '#34C759', fontSize: 15, fontWeight: 500 }}>正确答案：{ans.correct.join('、')}</Text>;
        }
        return (
          <div>
            {ans.options.map((o: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              const isCorrect = ans.correct?.includes(letter);
              return (
                <div key={i} style={{
                  padding: '6px 10px', marginBottom: 4, borderRadius: 8,
                  background: isCorrect ? 'rgba(52,199,89,0.08)' : 'transparent',
                  color: isCorrect ? '#34C759' : '#1D1D1F',
                  fontWeight: isCorrect ? 500 : 400,
                }}>
                  {letter}. {o || letter} {isCorrect && ' ✓'}
                </div>
              );
            })}
          </div>
        );
      }
      if (ans.blanks) {
        return (
          <Space wrap>
            {ans.blanks.map((b: string, i: number) => (
              <Tag key={i} color="green">{b}</Tag>
            ))}
          </Space>
        );
      }
      if (ans.reference) {
        return <MarkdownViewer content={ans.reference} />;
      }
      return <Text>{answerJson}</Text>;
    } catch {
      return <Text>{answerJson}</Text>;
    }
  };

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
      if (ans.options) {
        const hasOptionText = ans.options.some((o: string) => o?.trim());
        if (!hasOptionText && ans.correct?.length > 0) {
          return <Text style={{ color: '#34C759' }}>正确答案：{ans.correct.join('、')}</Text>;
        }
        return ans.options.map((o: string, i: number) => (
          <div key={i} style={{ color: ans.correct?.includes(String.fromCharCode(65 + i)) ? '#34C759' : '#1D1D1F', fontWeight: ans.correct?.includes(String.fromCharCode(65 + i)) ? 600 : 400 }}>
            {String.fromCharCode(65 + i)}. {o} {ans.correct?.includes(String.fromCharCode(65 + i)) && '✓'}
          </div>
        ));
      }
      if (ans.blanks) return <Space wrap>{ans.blanks.map((b: string, i: number) => <Tag key={i} color="green">{b}</Tag>)}</Space>;
      if (ans.reference) return <MarkdownViewer content={ans.reference} />;
      return <Text>{correctAnswer}</Text>;
    } catch { return <Text>{correctAnswer}</Text>; }
  };

  const getChoiceOptions = (ans: any): string[] => {
    const opts: string[] = ans.options || [];
    const hasText = opts.some((o: string) => o?.trim());
    if (hasText) return opts;
    const maxLetter = Math.max(4, ...(ans.correct || []).map((c: string) => c.charCodeAt(0) - 64));
    const result: string[] = [];
    for (let i = 0; i < maxLetter; i++) result.push(opts[i] || '');
    return result;
  };

  const renderAnswerInput = () => {
    if (answerData?.options) {
      const options = getChoiceOptions(answerData);
      const isMulti = (answerData.correct || []).length > 1;
      const selected = (() => { try { return JSON.parse(userAnswer || '{}').selected || []; } catch { return []; } })();
      return isMulti ? (
        <Checkbox.Group value={selected} onChange={(vals) => setUserAnswer(JSON.stringify({ selected: vals }))}>
          <Space direction="vertical">
            {options.map((opt: string, i: number) => (
              <Checkbox key={i} value={String.fromCharCode(65 + i)} style={{ fontSize: 15, padding: '4px 0' }}>{opt || String.fromCharCode(65 + i)}</Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      ) : (
        <Radio.Group onChange={(e) => setUserAnswer(JSON.stringify({ selected: [e.target.value] }))} value={selected[0]}>
          <Space direction="vertical">
            {options.map((opt: string, i: number) => (
              <Radio key={i} value={String.fromCharCode(65 + i)} style={{ fontSize: 15, padding: '4px 0' }}>{opt || String.fromCharCode(65 + i)}</Radio>
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
      const userAnswerStr = typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer);
      const { data } = await reviewApi.submitAnswer(session.session_id, {
        question_id: question.id,
        user_answer: userAnswerStr,
        current_index: currentIdx + 1,
      });
      const res = data.data || data;
      const correctAns = JSON.parse(res.correct_answer);

      // 选择题自动判断对错，跳过自评步骤
      if (answerData?.options) {
        const userAns = JSON.parse(userAnswerStr);
        const correctSet = new Set(correctAns.correct || []);
        const selectedSet = new Set(userAns.selected || []);
        const autoCorrect = correctSet.size === selectedSet.size && [...correctSet].every((c) => selectedSet.has(c));

        await reviewApi.submitAnswer(session.session_id, {
          question_id: question.id,
          user_answer: userAnswerStr,
          is_correct: autoCorrect,
          current_index: currentIdx + 1,
          rating: autoCorrect ? 3 : 1,
        });
        setIsCorrect(autoCorrect);
        setEvaluated(true);
        // Save to history
        setHistory((h) => ({
          ...h,
          [currentIdx]: {
            userAnswer: userAnswerStr,
            isCorrect: autoCorrect,
            correctAnswer: res.correct_answer,
            explanation: res.explanation,
            submitted: true,
            evaluated: true,
          },
        }));
      }

      setCorrectAnswer(res.correct_answer);
      setExplanation(res.explanation);
      setSubmitted(true);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '提交失败');
    } finally { setSubmitting(false); }
  };

  const handleEvaluate = async (correct: boolean, rating: number) => {
    setSubmitting(true);
    try {
      await reviewApi.submitAnswer(session.session_id, {
        question_id: question.id,
        user_answer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
        is_correct: correct,
        current_index: currentIdx + 1,
        rating,
      });
      setIsCorrect(correct);
      setEvaluated(true);
      // Save to history for back-navigation
      setHistory((h) => ({
        ...h,
        [currentIdx]: {
          userAnswer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
          isCorrect: correct,
          correctAnswer: correctAnswer,
          explanation: explanation,
          submitted: true,
          evaluated: true,
        },
      }));
    } catch (err: any) {
      message.error(err.response?.data?.detail || '提交失败');
    } finally { setSubmitting(false); }
  };

  const goToPrev = () => {
    if (currentIdx <= 0) return;
    const prevIdx = currentIdx - 1;
    const prev = history[prevIdx];
    if (prev) {
      setUserAnswer(prev.userAnswer);
      setCorrectAnswer(prev.correctAnswer);
      setExplanation(prev.explanation);
      setSubmitted(prev.submitted);
      setEvaluated(prev.evaluated);
      setIsCorrect(prev.isCorrect);
    }
    setCurrentIdx(prevIdx);
  };

  const goToNext = () => {
    if (currentIdx + 1 >= questions.length) return;
    const nextIdx = currentIdx + 1;
    const next = history[nextIdx];
    if (next) {
      setUserAnswer(next.userAnswer);
      setCorrectAnswer(next.correctAnswer);
      setExplanation(next.explanation);
      setSubmitted(next.submitted);
      setEvaluated(next.evaluated);
      setIsCorrect(next.isCorrect);
    } else {
      setUserAnswer(null);
      setSubmitted(false);
      setEvaluated(false);
      setCorrectAnswer('');
      setExplanation('');
    }
    setCurrentIdx(nextIdx);
  };

  const handleFinish = async () => {
    await reviewApi.finishSession(session.session_id);
    navigate('/review/result', { state: { session_id: session.session_id } });
  };

  const handleAbandon = () => {
    reviewApi.finishSession(session.session_id);
    navigate('/review');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Progress percent={Math.round(((currentIdx + (evaluated ? 1 : 0)) / questions.length) * 100)}
          format={() => `${currentIdx + (evaluated ? 1 : 0)} / ${questions.length}`}
          strokeColor="#007AFF" trailColor="rgba(60,60,67,0.06)" style={{ flex: 1, marginBottom: 0 }} />
        <Button size="small" danger icon={<StopOutlined />} onClick={handleAbandon}
          style={{ borderRadius: 8, flexShrink: 0 }}>放弃</Button>
      </div>

      <Card className="card-elevated" style={{ borderRadius: 14, marginBottom: 16 }}>
        <Space size={8} style={{ marginBottom: 12 }}>
          <Tag color="blue">{question.subject.name}</Tag>
          <Tag>{question.question_type.name}</Tag>
        </Space>
        <MarkdownViewer content={question.content} />
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
              <MarkdownViewer content={explanation} />
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>自评记忆程度</Text>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button danger size="large" loading={submitting}
                onClick={() => handleEvaluate(false, 1)}
                style={{ borderRadius: 10, minWidth: 100 }}>完全忘了</Button>
              <Button size="large" loading={submitting}
                onClick={() => handleEvaluate(true, 2)}
                style={{ borderRadius: 10, minWidth: 100, color: '#FF9500', borderColor: '#FF9500' }}>勉强想起</Button>
              <Button size="large" loading={submitting}
                onClick={() => handleEvaluate(true, 3)}
                style={{ borderRadius: 10, minWidth: 100, color: '#007AFF', borderColor: '#007AFF' }}>顺利答对</Button>
              <Button type="primary" size="large" loading={submitting}
                onClick={() => handleEvaluate(true, 4)}
                style={{ background: '#34C759', borderColor: '#34C759', borderRadius: 10, minWidth: 100 }}>太简单了</Button>
            </div>
          </div>
        </Card>
      )}

      {/* After self-evaluation — result + answer comparison + actions */}
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

          {/* Answer comparison — show for auto-graded questions that skipped the self-eval step */}
          {correctAnswer && (
            <div style={{ textAlign: 'left', marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
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
                <div style={{ background: 'rgba(242,242,247,0.6)', padding: 16, borderRadius: 10, marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>解析</Text>
                  <MarkdownViewer content={explanation} />
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button
              size="large"
              icon={<LeftOutlined />}
              disabled={currentIdx <= 0}
              onClick={goToPrev}
              style={{ height: 44, borderRadius: 10, padding: '0 20px', fontWeight: 500 }}
            >
              上一题
            </Button>
            <Button
              size="large"
              onClick={openQuestionDetail}
              style={{ height: 44, borderRadius: 10, padding: '0 24px', fontWeight: 500 }}
            >
              查看题目详情
            </Button>
            {currentIdx + 1 >= questions.length ? (
              <Button type="primary" size="large" icon={<RightOutlined />} onClick={handleFinish}
                style={{ height: 44, borderRadius: 10, padding: '0 40px', fontWeight: 600 }}>
                查看结果
              </Button>
            ) : (
              <Button type="primary" size="large" icon={<RightOutlined />} onClick={goToNext}
                style={{ height: 44, borderRadius: 10, padding: '0 40px', fontWeight: 600 }}>
                下一题
              </Button>
            )}
          </div>
        </Card>
      )}

      <Drawer
        title="题目详情"
        placement="right"
        width={520}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        destroyOnClose
      >
        {drawerLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : drawerData ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space size={8}>
                <Tag color="blue">{question.subject.name}</Tag>
                <Tag>{question.question_type.name}</Tag>
                {drawerData.tags.map((t: any) => (
                  <Tag key={t.id} color={t.color}>{t.name}</Tag>
                ))}
              </Space>
            </div>

            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>题目内容</Text>
            <div style={{ marginBottom: 20, padding: 16, background: 'rgba(242,242,247,0.6)', borderRadius: 10 }}>
              <MarkdownViewer content={drawerData.content} />
            </div>

            {drawerData.source && (
              <div style={{ marginBottom: 20 }}>
                <Text className="text-secondary" style={{ fontSize: 12 }}>来源：{drawerData.source}</Text>
              </div>
            )}

            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>答案</Text>
            <div style={{ marginBottom: 20, padding: 16, background: 'rgba(52,199,89,0.06)', borderRadius: 10 }}>
              {renderAnswerForDrawer(drawerData.answer)}
            </div>

            {drawerData.explanation && (
              <>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>解析</Text>
                <div style={{ marginBottom: 20, padding: 16, background: 'rgba(0,122,255,0.04)', borderRadius: 10 }}>
                  <MarkdownViewer content={drawerData.explanation} />
                </div>
              </>
            )}

            <div style={{
              display: 'flex', gap: 24, padding: 16,
              background: 'rgba(242,242,247,0.4)', borderRadius: 10, marginBottom: 20,
            }}>
              <Statistic title="练习次数" value={drawerData.total_attempts} />
              <Statistic title="正确次数" value={drawerData.correct_attempts}
                valueStyle={{ color: '#34C759' }} />
              <Statistic title="正确率" value={Math.round(drawerData.accuracy * 100) / 100}
                suffix="%" valueStyle={{ color: drawerData.accuracy >= 60 ? '#34C759' : '#FF3B30' }} />
            </div>

            {drawerNotes.length > 0 && (
              <>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>个人笔记</Text>
                {drawerNotes.map((n) => (
                  <div key={n.id} style={{
                    padding: 12, marginBottom: 8,
                    background: 'rgba(242,242,247,0.3)', borderRadius: 10,
                  }}>
                    <MarkdownViewer content={n.content} />
                    <Text className="text-tertiary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                      {n.updated_at ? new Date(n.updated_at).toLocaleString('zh-CN') : ''}
                    </Text>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
