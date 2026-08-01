import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Button, Progress, Space, Input, Radio, Checkbox, Tag, message, Drawer, Spin, Statistic } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, StopOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { reviewApi } from '../api/review';
import { questionsApi } from '../api/questions';
import { notesApi } from '../api/notes';
import { useTheme } from '../store/ThemeProvider';
import { getCssVar } from '../utils/themeVars';
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
  useTheme(); // 订阅主题变化（Progress strokeColor 需重渲染刷新）
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

  // 每题生成一次选项随机顺序（防位置记忆）；显示字母 j 对应原始索引 optionOrder[j]
  const optionOrder = useMemo(() => {
    const cur = questions[currentIdx];
    let n = 0;
    try {
      const ans = JSON.parse(cur?.answer || '');
      if (Array.isArray(ans.options)) n = ans.options.length;
    } catch {}
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }, [questions, currentIdx]);

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
          return <Text style={{ color: 'var(--red-pen)', fontSize: 15, fontWeight: 500 }}>正确答案：{ans.correct.join('、')}</Text>;
        }
        return (
          <div>
            {ans.options.map((o: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              const isCorrect = ans.correct?.includes(letter);
              return (
                <div key={i} style={{
                  padding: '6px 10px', marginBottom: 4, borderRadius: 8,
                  background: isCorrect ? 'var(--success-green-08)' : 'transparent',
                  color: isCorrect ? 'var(--success-green)' : 'var(--ink)',
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
              <Tag key={i} color="red">{b}</Tag>
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

  const renderUserAnswerText = (order: number[] = []) => {
    if (!userAnswer) return '(未作答)';
    try {
      const ans = JSON.parse(typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer));
      if (ans.selected?.length) {
        // 存储为原始字母，按当前随机顺序反推为显示字母，与作答区保持一致
        return ans.selected
          .map((c: string) => {
            const idx = c.charCodeAt(0) - 65;
            const pos = order.indexOf(idx);
            return pos >= 0 ? String.fromCharCode(65 + pos) : c;
          })
          .join(', ');
      }
      if (ans.blanks?.length) return ans.blanks.join(' 、 ');
      if (ans.reference) return ans.reference;
      return JSON.stringify(ans);
    } catch { return String(userAnswer); }
  };

  const renderCorrectAnswerText = (order: number[] = []) => {
    try {
      const ans = JSON.parse(correctAnswer);
      if (ans.options) {
        const hasOptionText = ans.options.some((o: string) => o?.trim());
        if (!hasOptionText && ans.correct?.length > 0) {
          return <Text style={{ color: 'var(--red-pen)' }}>正确答案：{ans.correct.join('、')}</Text>;
        }
        return ans.options.map((_: string, j: number) => {
          // 按当前随机顺序展示，与作答区字母对应；打勾判断用原始字母
          const originalIdx = order[j] ?? j;
          const origLetter = String.fromCharCode(65 + originalIdx);
          const isCorrect = ans.correct?.includes(origLetter);
          return (
            <div key={j} style={{ color: isCorrect ? 'var(--success-green)' : 'var(--ink)', fontWeight: isCorrect ? 600 : 400 }}>
              {String.fromCharCode(65 + j)}. {ans.options[originalIdx]} {isCorrect && '✓'}
            </div>
          );
        });
      }
      if (ans.blanks) return <Space wrap>{ans.blanks.map((b: string, i: number) => <Tag key={i} color="red">{b}</Tag>)}</Space>;
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
            {options.map((_: string, j: number) => {
              const originalIdx = optionOrder[j] ?? j;
              return (
                <Checkbox key={j} value={String.fromCharCode(65 + j)} style={{ fontSize: 15, padding: '4px 0' }}>
                  {String.fromCharCode(65 + j)}. {options[originalIdx] || String.fromCharCode(65 + originalIdx)}
                </Checkbox>
              );
            })}
          </Space>
        </Checkbox.Group>
      ) : (
        <Radio.Group onChange={(e) => setUserAnswer(JSON.stringify({ selected: [e.target.value] }))} value={selected[0]}>
          <Space direction="vertical">
            {options.map((_: string, j: number) => {
              const originalIdx = optionOrder[j] ?? j;
              return (
                <Radio key={j} value={String.fromCharCode(65 + j)} style={{ fontSize: 15, padding: '4px 0' }}>
                  {String.fromCharCode(65 + j)}. {options[originalIdx] || String.fromCharCode(65 + originalIdx)}
                </Radio>
              );
            })}
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
        // 选项已随机打乱：显示字母 j 对应原始索引 optionOrder[j]，映射回原始字母再判分/存储
        const mappedSelected = (userAns.selected || []).map((c: string) => {
          const j = c.charCodeAt(0) - 65;
          return String.fromCharCode(65 + (optionOrder[j] ?? j));
        });
        const storedUserAnswer = JSON.stringify({ ...userAns, selected: mappedSelected });
        // 提交后 state 同步为映射后的原始字母，展示反推不再二次偏移
        setUserAnswer(storedUserAnswer);
        const correctSet = new Set(correctAns.correct || []);
        const selectedSet = new Set(mappedSelected);
        const autoCorrect = correctSet.size === selectedSet.size && [...correctSet].every((c) => selectedSet.has(c));

        await reviewApi.submitAnswer(session.session_id, {
          question_id: question.id,
          user_answer: storedUserAnswer,
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
            userAnswer: storedUserAnswer,
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
          strokeColor={getCssVar('--blue-ink')} trailColor={getCssVar('--ink-alpha-06')} style={{ flex: 1, marginBottom: 0 }} />
        <Button size="small" danger icon={<StopOutlined />} onClick={handleAbandon}
          style={{ borderRadius: 8, flexShrink: 0 }}>放弃</Button>
      </div>

      <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
        <Space size={8} style={{ marginBottom: 12 }}>
          <Tag color="blue">{question.subject.name}</Tag>
          <Tag>{question.question_type.name}</Tag>
        </Space>
        <MarkdownViewer content={question.content} />
      </Card>

      {/* Answer input */}
      {!submitted && (
        <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
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
        <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--blue-ink-04)', padding: 16, borderRadius: 10 }}>
              <Text strong style={{ color: 'var(--blue-ink)', display: 'block', marginBottom: 8 }}>你的答案</Text>
              <Text>{renderUserAnswerText(optionOrder)}</Text>
            </div>
            <div style={{ background: 'var(--red-pen-05)', padding: 16, borderRadius: 10 }}>
              <Text strong style={{ color: 'var(--red-pen)', display: 'block', marginBottom: 8 }}>正确答案</Text>
              <div>{renderCorrectAnswerText(optionOrder)}</div>
            </div>
          </div>
          {explanation && (
            <div style={{ background: 'var(--paper-deep-60)', padding: 16, borderRadius: 10, marginBottom: 20 }}>
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
                style={{ borderRadius: 10, minWidth: 100, color: 'var(--amber)', borderColor: 'var(--amber)' }}>勉强想起</Button>
              <Button size="large" loading={submitting}
                onClick={() => handleEvaluate(true, 3)}
                style={{ borderRadius: 10, minWidth: 100, color: 'var(--blue-ink)', borderColor: 'var(--blue-ink)' }}>顺利答对</Button>
              <Button type="primary" size="large" loading={submitting}
                onClick={() => handleEvaluate(true, 4)}
                style={{ background: 'var(--red-pen)', borderColor: 'var(--red-pen)', borderRadius: 10, minWidth: 100 }}>太简单了</Button>
            </div>
          </div>
        </Card>
      )}

      {/* After self-evaluation — result + answer comparison + actions */}
      {evaluated && (
        <Card className="card-elevated" style={{ borderRadius: 10, marginBottom: 16, textAlign: 'center' }}>
          {isCorrect ? (
            <>
              <CheckCircleFilled style={{ fontSize: 48, color: 'var(--success-green)', marginBottom: 8 }} />
              <Title level={5} style={{ color: 'var(--success-green)', margin: 0 }}>回答正确！</Title>
            </>
          ) : (
            <>
              <CloseCircleFilled style={{ fontSize: 48, color: 'var(--red-pen-deep)', marginBottom: 8 }} />
              <Title level={5} style={{ color: 'var(--red-pen-deep)', margin: 0 }}>回答错误</Title>
            </>
          )}

          {/* Answer comparison — show for auto-graded questions that skipped the self-eval step */}
          {correctAnswer && (
            <div style={{ textAlign: 'left', marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ background: 'var(--blue-ink-04)', padding: 16, borderRadius: 10 }}>
                  <Text strong style={{ color: 'var(--blue-ink)', display: 'block', marginBottom: 8 }}>你的答案</Text>
                  <Text>{renderUserAnswerText(optionOrder)}</Text>
                </div>
                <div style={{ background: 'var(--red-pen-05)', padding: 16, borderRadius: 10 }}>
                  <Text strong style={{ color: 'var(--red-pen)', display: 'block', marginBottom: 8 }}>正确答案</Text>
                  <div>{renderCorrectAnswerText(optionOrder)}</div>
                </div>
              </div>
              {explanation && (
                <div style={{ background: 'var(--paper-deep-60)', padding: 16, borderRadius: 10, marginBottom: 16 }}>
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
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--paper-deep-60)', borderRadius: 10 }}>
              <MarkdownViewer content={drawerData.content} />
            </div>

            {drawerData.source && (
              <div style={{ marginBottom: 20 }}>
                <Text className="text-secondary" style={{ fontSize: 12 }}>来源：{drawerData.source}</Text>
              </div>
            )}

            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>答案</Text>
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--red-pen-05)', borderRadius: 10 }}>
              {renderAnswerForDrawer(drawerData.answer)}
            </div>

            {drawerData.explanation && (
              <>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>解析</Text>
                <div style={{ marginBottom: 20, padding: 16, background: 'var(--blue-ink-04)', borderRadius: 10 }}>
                  <MarkdownViewer content={drawerData.explanation} />
                </div>
              </>
            )}

            <div style={{
              display: 'flex', gap: 24, padding: 16,
              background: 'var(--paper-deep-60)', borderRadius: 10, marginBottom: 20,
            }}>
              <Statistic title="练习次数" value={drawerData.total_attempts} />
              <Statistic title="正确次数" value={drawerData.correct_attempts}
                valueStyle={{ color: 'var(--red-pen)' }} />
              <Statistic title="正确率" value={Math.round(drawerData.accuracy * 100) / 100}
                suffix="%" valueStyle={{ color: drawerData.accuracy >= 60 ? 'var(--red-pen)' : 'var(--red-pen-deep)' }} />
            </div>

            {drawerNotes.length > 0 && (
              <>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>个人笔记</Text>
                {drawerNotes.map((n) => (
                  <div key={n.id} style={{
                    padding: 12, marginBottom: 8,
                    background: 'var(--paper-deep-50)', borderRadius: 10,
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
