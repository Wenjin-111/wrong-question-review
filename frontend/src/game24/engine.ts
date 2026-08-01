// 算24游戏引擎：token 化表达式、有理数求值、穷举求解、难度判定、按难度出题

export type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'lparen' }
  | { type: 'rparen' };

export type Difficulty = 'easy' | 'medium' | 'hard';

const OPS: Array<'+' | '-' | '*' | '/'> = ['+', '-', '*', '/'];

const OP_DISPLAY: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export class Fraction {
  readonly num: number;
  readonly den: number;

  constructor(num: number, den: number = 1) {
    if (den === 0) throw new Error('division by zero');
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den);
    this.num = num / g;
    this.den = den / g;
  }

  isInt(): boolean {
    return this.den === 1;
  }

  toNumber(): number {
    return this.num / this.den;
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.num * o.den + o.num * this.den, this.den * o.den);
  }

  sub(o: Fraction): Fraction {
    return new Fraction(this.num * o.den - o.num * this.den, this.den * o.den);
  }

  mul(o: Fraction): Fraction {
    return new Fraction(this.num * o.num, this.den * o.den);
  }

  div(o: Fraction): Fraction {
    return new Fraction(this.num * o.den, this.den * o.num);
  }

  equals(o: Fraction): boolean {
    return this.num === o.num && this.den === o.den;
  }
}

export function tokensToDisplay(tokens: Token[]): string {
  return tokens
    .map((t) =>
      t.type === 'num' ? String(t.value)
        : t.type === 'op' ? OP_DISPLAY[t.value]
        : t.type === 'lparen' ? '('
        : ')',
    )
    .join('');
}

export function parseAndEval(tokens: Token[]): Fraction {
  if (tokens.length === 0) throw new Error('表达式为空');
  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const next = (): Token | undefined => tokens[pos++];

  function parseExpr(): Fraction {
    let left = parseTerm();
    while (pos < tokens.length) {
      const t = peek();
      if (t?.type === 'op' && (t.value === '+' || t.value === '-')) {
        next();
        const right = parseTerm();
        left = t.value === '+' ? left.add(right) : left.sub(right);
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): Fraction {
    let left = parseFactor();
    while (pos < tokens.length) {
      const t = peek();
      if (t?.type === 'op' && (t.value === '*' || t.value === '/')) {
        next();
        const right = parseFactor();
        left = t.value === '*' ? left.mul(right) : left.div(right);
      } else {
        break;
      }
    }
    return left;
  }

  function parseFactor(): Fraction {
    const t = next();
    if (!t) throw new Error('表达式不完整');
    if (t.type === 'num') return new Fraction(t.value);
    if (t.type === 'lparen') {
      const v = parseExpr();
      const close = next();
      if (!close || close.type !== 'rparen') throw new Error('括号不匹配');
      return v;
    }
    throw new Error('语法错误');
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('语法错误');
  return result;
}

function tryEval(a: Fraction, b: Fraction, op: string): Fraction | null {
  try {
    return op === '+' ? a.add(b) : op === '-' ? a.sub(b) : op === '*' ? a.mul(b) : a.div(b);
  } catch {
    return null;
  }
}

function uniquePermutations(nums: number[]): number[][] {
  const sorted = [...nums].sort((a, b) => a - b);
  const result: number[][] = [];
  const current: number[] = [];
  const used = new Array(sorted.length).fill(false);

  function backtrack(): void {
    if (current.length === sorted.length) {
      result.push([...current]);
      return;
    }
    let prev = NaN;
    for (let i = 0; i < sorted.length; i++) {
      if (used[i] || sorted[i] === prev) continue;
      prev = sorted[i];
      used[i] = true;
      current.push(sorted[i]);
      backtrack();
      current.pop();
      used[i] = false;
    }
  }
  backtrack();
  return result;
}

export interface SolveResult {
  hasAny: boolean;
  hasInt: boolean;
  expr: string;
}

export function solve(nums: number[]): SolveResult | null {
  const TARGET = new Fraction(24);
  let anyExpr: string | null = null;
  let intExpr: string | null = null;

  for (const [a, b, c, d] of uniquePermutations(nums)) {
    for (const o1 of OPS) {
      for (const o2 of OPS) {
        for (const o3 of OPS) {
          const f1 = new Fraction(a);
          const f2 = new Fraction(b);
          const f3 = new Fraction(c);
          const f4 = new Fraction(d);
          const show = (x: number) => String(x);
          const shapes: Array<{ expr: string; ints: Fraction[] | null }> = [
            {
              // ((a∘b)∘c)∘d
              expr: `((${show(a)}${OP_DISPLAY[o1]}${show(b)})${OP_DISPLAY[o2]}${show(c)})${OP_DISPLAY[o3]}${show(d)}`,
              ints: (() => {
                const v1 = tryEval(f1, f2, o1);
                if (!v1) return null;
                const v2 = tryEval(v1, f3, o2);
                if (!v2) return null;
                const v3 = tryEval(v2, f4, o3);
                return v3 ? [v1, v2, v3] : null;
              })(),
            },
            {
              // (a∘(b∘c))∘d
              expr: `(${show(a)}${OP_DISPLAY[o1]}(${show(b)}${OP_DISPLAY[o2]}${show(c)}))${OP_DISPLAY[o3]}${show(d)}`,
              ints: (() => {
                const v1 = tryEval(f2, f3, o2);
                if (!v1) return null;
                const v2 = tryEval(f1, v1, o1);
                if (!v2) return null;
                const v3 = tryEval(v2, f4, o3);
                return v3 ? [v1, v2, v3] : null;
              })(),
            },
            {
              // a∘((b∘c)∘d)
              expr: `${show(a)}${OP_DISPLAY[o1]}((${show(b)}${OP_DISPLAY[o2]}${show(c)})${OP_DISPLAY[o3]}${show(d)})`,
              ints: (() => {
                const v1 = tryEval(f2, f3, o2);
                if (!v1) return null;
                const v2 = tryEval(v1, f4, o3);
                if (!v2) return null;
                const v3 = tryEval(f1, v2, o1);
                return v3 ? [v1, v2, v3] : null;
              })(),
            },
            {
              // a∘(b∘(c∘d))
              expr: `${show(a)}${OP_DISPLAY[o1]}(${show(b)}${OP_DISPLAY[o2]}(${show(c)}${OP_DISPLAY[o3]}${show(d)}))`,
              ints: (() => {
                const v1 = tryEval(f3, f4, o3);
                if (!v1) return null;
                const v2 = tryEval(f2, v1, o2);
                if (!v2) return null;
                const v3 = tryEval(f1, v2, o1);
                return v3 ? [v1, v2, v3] : null;
              })(),
            },
            {
              // (a∘b)∘(c∘d)
              expr: `(${show(a)}${OP_DISPLAY[o1]}${show(b)})${OP_DISPLAY[o2]}(${show(c)}${OP_DISPLAY[o3]}${show(d)})`,
              ints: (() => {
                const v1 = tryEval(f1, f2, o1);
                if (!v1) return null;
                const v2 = tryEval(f3, f4, o3);
                if (!v2) return null;
                const v3 = tryEval(v1, v2, o2);
                return v3 ? [v1, v2, v3] : null;
              })(),
            },
          ];

          for (const s of shapes) {
            if (!s.ints) continue;
            const last = s.ints[s.ints.length - 1];
            if (last.equals(TARGET)) {
              if (!anyExpr) anyExpr = s.expr;
              if (!intExpr && s.ints.every((f) => f.isInt())) intExpr = s.expr;
            }
          }
        }
      }
    }
  }

  if (!anyExpr) return null;
  return { hasAny: true, hasInt: intExpr !== null, expr: intExpr ?? anyExpr };
}

export function classify(nums: number[]): Difficulty | null {
  const solved = solve(nums);
  if (!solved) return null;
  const max = Math.max(...nums);
  // 解法复杂度优先：仅分数解的题一律归困难，数字大小再用于区分简单/中等
  if (!solved.hasInt) return 'hard';
  if (max <= 9) return 'easy';
  if (max <= 10) return 'medium';
  return null;
}

export const RANGES: Record<Difficulty, [number, number]> = {
  easy: [1, 9],
  medium: [1, 10],
  hard: [1, 13],
};

const SEED_POOLS: Record<Difficulty, number[][]> = {
  easy: [
    [1, 2, 3, 4],
    [1, 2, 3, 5],
    [1, 2, 4, 6],
    [2, 3, 4, 5],
  ],
  medium: [
    [4, 5, 8, 10],
    [2, 4, 8, 10],
    [3, 5, 7, 10],
    [1, 6, 8, 10],
  ],
  hard: [
    [3, 3, 8, 8],
    [1, 5, 5, 5],
    [1, 3, 4, 6],
    [3, 3, 7, 7],
  ],
};

export function sortedKey(nums: number[]): string {
  return [...nums].sort((a, b) => a - b).join(',');
}

export function generate(difficulty: Difficulty, exclude?: Set<string>): number[] {
  const [lo, hi] = RANGES[difficulty];
  for (let i = 0; i < 500; i++) {
    const nums = Array.from({ length: 4 }, () => lo + Math.floor(Math.random() * (hi - lo + 1)));
    if (classify(nums) === difficulty) {
      const key = sortedKey(nums);
      if (!exclude?.has(key)) return nums;
    }
  }
  for (const seed of SEED_POOLS[difficulty]) {
    const key = sortedKey(seed);
    if (!exclude?.has(key)) return [...seed];
  }
  return [...SEED_POOLS[difficulty][0]];
}

export type ValidationResult =
  | { ok: true; value: Fraction }
  | { ok: false; reason: string };

export function validateExpression(tokens: Token[], nums: number[]): ValidationResult {
  const used = tokens
    .filter((t): t is { type: 'num'; value: number } => t.type === 'num')
    .map((t) => t.value)
    .sort((a, b) => a - b);
  const needed = [...nums].sort((a, b) => a - b);
  if (used.length !== needed.length || used.some((v, i) => v !== needed[i])) {
    return { ok: false, reason: '必须恰好使用全部 4 个数字各一次' };
  }
  let value: Fraction;
  try {
    value = parseAndEval(tokens);
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
  if (!value.equals(new Fraction(24))) {
    return { ok: false, reason: `结果等于 ${value.toNumber()}，不是 24` };
  }
  return { ok: true, value };
}
