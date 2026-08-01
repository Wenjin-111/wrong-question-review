import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Progress, Segmented, Space, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import {
  generate, solve, tokensToDisplay, validateExpression, sortedKey,
  type Difficulty, type Token,
} from '../../game24/engine';
import { useTheme } from '../../store/ThemeProvider';
import { getCssVar } from '../../utils/themeVars';

const { Text } = Typography;

const CHALLENGE_SECONDS = 60;

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: '数字 1-9 · 整数解',
  medium: '数字 1-10 · 常规解',
  hard: '数字 1-13 · 分数解',
};

interface Feedback {
  type: 'correct' | 'wrong' | 'error';
  text: string;
}

interface ChallengeState {
  status: 'idle' | 'running' | 'finished';
  score: number;
  correct: number;
  wrong: number;
  combo: number;
}

const INITIAL_CHALLENGE: ChallengeState = { status: 'idle', score: 0, correct: 0, wrong: 0, combo: 0 };

export default function Game24Modal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={460} destroyOnHidden closable={false}>
      <GameContent onClose={onClose} />
    </Modal>
  );
}

function GameContent({ onClose }: { onClose: () => void }) {
  useTheme(); // 订阅主题变化（Progress strokeColor 需重渲染刷新）
  const [mode, setMode] = useState<'practice' | 'challenge'>('practice');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [nums, setNums] = useState<number[]>(() => generate('easy'));
  const [tokens, setTokens] = useState<Token[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeState>(INITIAL_CHALLENGE);
  const [remaining, setRemaining] = useState(CHALLENGE_SECONDS);
  const usedKeys = useRef<Set<string>>(new Set());

  const answerExpr = useMemo(() => solve(nums)?.expr ?? '', [nums]);

  const advanceQuestion = useCallback(() => {
    setNums((prev) => {
      usedKeys.current.add(sortedKey(prev));
      return generate(difficulty, usedKeys.current);
    });
    setTokens([]);
    setFeedback(null);
    setShowAnswer(false);
  }, [difficulty]);

  const appendToken = (token: Token) => setTokens((prev) => [...prev, token]);

  const submit = () => {
    if (mode === 'challenge' && challenge.status !== 'running') return;
    const result = validateExpression(tokens, nums);
    if (!result.ok) {
      const isWrong = result.reason.startsWith('结果等于');
      setFeedback({ type: isWrong ? 'wrong' : 'error', text: result.reason });
      if (mode === 'challenge' && isWrong) {
        setChallenge((s) => ({ ...s, wrong: s.wrong + 1, combo: 0 }));
      }
      return;
    }
    if (mode === 'practice') {
      setFeedback({ type: 'correct', text: '答对了！' });
      return;
    }
    setChallenge((s) => ({ ...s, score: s.score + 10, correct: s.correct + 1, combo: s.combo + 1 }));
    advanceQuestion();
  };

  const startChallenge = () => {
    usedKeys.current.clear();
    setRemaining(CHALLENGE_SECONDS);
    setChallenge({ status: 'running', score: 0, correct: 0, wrong: 0, combo: 0 });
    setNums(generate(difficulty));
    setTokens([]);
    setFeedback(null);
    setShowAnswer(false);
  };

  const handleModeChange = (value: string | number) => {
    setMode(value as 'practice' | 'challenge');
    setTokens([]);
    setFeedback(null);
    setShowAnswer(false);
    setChallenge(INITIAL_CHALLENGE);
    setRemaining(CHALLENGE_SECONDS);
  };

  const handleDifficultyChange = (value: string | number) => {
    const diff = value as Difficulty;
    setDifficulty(diff);
    setNums(generate(diff));
    setTokens([]);
    setFeedback(null);
    setShowAnswer(false);
  };

  useEffect(() => {
    if (challenge.status !== 'running') return;
    const deadline = Date.now() + CHALLENGE_SECONDS * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        setChallenge((s) => ({ ...s, status: 'finished' }));
      }
    }, 250);
    return () => clearInterval(timer);
  }, [challenge.status]);

  useEffect(() => {
    if (mode !== 'challenge' || challenge.status !== 'running' || feedback?.type !== 'wrong') return;
    const t = setTimeout(advanceQuestion, 1200);
    return () => clearTimeout(t);
  }, [feedback, mode, challenge.status, advanceQuestion]);

  const usedCount = (value: number) => tokens.filter((t) => t.type === 'num' && t.value === value).length;
  const totalCount = (value: number) => nums.filter((n) => n === value).length;

  const running = mode === 'challenge' && challenge.status === 'running';
  const inGame = mode === 'practice' || running;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 18, letterSpacing: '-0.02em' }}>算24</Text>
        <Space size={4}>
          <Segmented
            size="small"
            value={mode}
            onChange={handleModeChange}
            options={[
              { label: '练习', value: 'practice' },
              { label: '挑战', value: 'challenge' },
            ]}
          />
          <Button type="text" size="small" aria-label="close" icon={<CloseOutlined />} onClick={onClose} />
        </Space>
      </div>

      {mode === 'challenge' && challenge.status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <Text style={{ fontSize: 15, display: 'block', marginBottom: 20 }}>
            60 秒内尽可能多地解题，答对得 10 分。
          </Text>
          <div style={{ marginBottom: 24 }}>
            <Segmented
              value={difficulty}
              onChange={handleDifficultyChange}
              options={Object.keys(DIFFICULTY_LABELS).map((d) => ({
                label: DIFFICULTY_LABELS[d as Difficulty],
                value: d,
              }))}
            />
            <Text className="text-secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              {DIFFICULTY_DESC[difficulty]}
            </Text>
          </div>
          <Button type="primary" size="large" style={{ width: 200 }} onClick={startChallenge}>
            开始挑战
          </Button>
        </div>
      )}

      {mode === 'challenge' && challenge.status === 'finished' && (
        <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
          <Text style={{ fontSize: 16, color: 'var(--red-pen-deep)', display: 'block', marginBottom: 20 }}>时间到！</Text>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 28 }}>
            <div>
              <Text style={{ fontSize: 32, fontWeight: 700, color: 'var(--blue-ink)', display: 'block' }}>{challenge.score}</Text>
              <Text className="text-secondary" style={{ fontSize: 13 }}>得分</Text>
            </div>
            <div>
              <Text style={{ fontSize: 32, fontWeight: 700, color: 'var(--red-pen)', display: 'block' }}>{challenge.correct}</Text>
              <Text className="text-secondary" style={{ fontSize: 13 }}>答对</Text>
            </div>
            <div>
              <Text style={{ fontSize: 32, fontWeight: 700, color: 'var(--red-pen-deep)', display: 'block' }}>{challenge.wrong}</Text>
              <Text className="text-secondary" style={{ fontSize: 13 }}>答错</Text>
            </div>
          </div>
          <Text className="text-secondary" style={{ fontSize: 13, display: 'block', marginBottom: 24 }}>
            正确率 {challenge.correct + challenge.wrong > 0 ? Math.round((challenge.correct / (challenge.correct + challenge.wrong)) * 100) : 0}%
          </Text>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                setChallenge(INITIAL_CHALLENGE);
                setRemaining(CHALLENGE_SECONDS);
                setTokens([]);
                setFeedback(null);
              }}
            >
              再来一局
            </Button>
            <Button onClick={onClose}>关闭</Button>
          </Space>
        </div>
      )}

      {inGame && (
        <>
          {mode === 'challenge' && (
            <div style={{ marginBottom: 16 }}>
              <Progress
                percent={Math.round((remaining / CHALLENGE_SECONDS) * 100)}
                format={() => `${remaining}s`}
                strokeColor={remaining <= 10 ? getCssVar('--red-pen-deep') : getCssVar('--blue-ink')}
                size="small"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text className="text-secondary" style={{ fontSize: 12 }}>得分 {challenge.score}</Text>
                <Text className="text-secondary" style={{ fontSize: 12 }}>连击 ×{challenge.combo}</Text>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {nums.map((n, i) => {
              const disabled = totalCount(n) - usedCount(n) <= 0;
              return (
                <Button
                  key={i}
                  size="large"
                  disabled={disabled}
                  onClick={() => appendToken({ type: 'num', value: n })}
                  style={{
                    flex: 1,
                    height: 56,
                    fontSize: 24,
                    fontWeight: 700,
                    borderRadius: 12,
                  }}
                >
                  {n}
                </Button>
              );
            })}
          </div>

          <div
            style={{
              minHeight: 56,
              background: 'var(--paper-bg)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 12,
              fontSize: 24,
              fontFamily: 'ui-monospace, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              color: tokens.length ? 'var(--ink)' : 'var(--ink-tertiary)',
            }}
          >
            {tokens.length ? tokensToDisplay(tokens) : '点击下方按钮构建算式…'}
            <span style={{ width: 2, height: 24, background: 'var(--blue-ink)', animation: 'blink 1s step-start infinite' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {(['+', '-', '*', '/'] as const).map((op) => (
              <Button
                key={op}
                onClick={() => appendToken({ type: 'op', value: op })}
                style={{ height: 44, fontSize: 20, borderRadius: 10 }}
              >
                {op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op}
              </Button>
            ))}
            <Button onClick={() => appendToken({ type: 'lparen' })} style={{ height: 44, fontSize: 20, borderRadius: 10 }}>(</Button>
            <Button onClick={() => appendToken({ type: 'rparen' })} style={{ height: 44, fontSize: 20, borderRadius: 10 }}>)</Button>
            <Button onClick={() => setTokens((prev) => prev.slice(0, -1))} style={{ height: 44, fontSize: 20, borderRadius: 10 }}>⌫</Button>
            <Button onClick={() => { setTokens([]); setFeedback(null); }} style={{ height: 44, fontSize: 20, borderRadius: 10 }}>清空</Button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {mode === 'practice' && (
              <Space>
                <Button
                  size="large"
                  onClick={() => setShowAnswer((v) => !v)}
                  style={{ borderRadius: 10 }}
                >
                  {showAnswer ? '隐藏答案' : '看答案'}
                </Button>
                <Button size="large" onClick={advanceQuestion} style={{ borderRadius: 10 }}>
                  换一题
                </Button>
              </Space>
            )}
            <Button
              type="primary"
              size="large"
              disabled={tokens.length === 0}
              onClick={submit}
              style={{ flex: 1, borderRadius: 10 }}
            >
              提交 ✓
            </Button>
          </div>

          {feedback && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 14,
                background:
                  feedback.type === 'correct' ? 'var(--red-pen-10)'
                    : feedback.type === 'wrong' ? 'var(--red-pen-deep-12)'
                    : 'var(--amber-12)',
                color:
                  feedback.type === 'correct' ? 'var(--red-pen)'
                    : feedback.type === 'wrong' ? 'var(--red-pen-deep)'
                    : 'var(--amber-deep)',
              }}
            >
              {feedback.type === 'correct' ? '✓ ' : feedback.type === 'wrong' ? '✗ ' : '⚠ '}
              {feedback.text}
              {mode === 'challenge' && feedback.type === 'wrong' && ' · 即将换题'}
            </div>
          )}

          {showAnswer && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 16,
                fontFamily: 'ui-monospace, monospace',
                background: 'var(--blue-ink-08)',
                color: 'var(--blue-ink)',
              }}
            >
              答案：{answerExpr}
            </div>
          )}
        </>
      )}
    </div>
  );
}
