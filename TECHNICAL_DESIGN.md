# 错题收集与重做系统 - 技术设计文档

## 1. 项目结构

```
错题收集重做/
├── frontend/                          # React 前端
│   ├── src/
│   │   ├── api/                       # Axios 封装 + 各模块 API
│   │   │   ├── client.ts              # Axios 实例（拦截器、JWT 续期）
│   │   │   ├── auth.ts                # 登录/注册
│   │   │   ├── subjects.ts            # 学科
│   │   │   ├── tags.ts                # 标签
│   │   │   ├── questions.ts           # 错题 CRUD
│   │   │   ├── review.ts              # 重做（session/resume/submit/finish）
│   │   │   ├── stats.ts               # 统计（dashboard/trends/streak）
│   │   │   ├── chat.ts                # AI 对话（会话 CRUD/消息/绑定）
│   │   │   ├── notes.ts               # 题目笔记
│   │   │   ├── draft.ts               # 草稿
│   │   │   ├── export.ts              # 导出
│   │   │   ├── ocr.ts                 # OCR 识别
│   │   │   ├── upload.ts              # 图片上传
│   │   │   └── settings.ts            # 用户设置（含 FSRS 保留率、算24开关）
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── ImageCropper.tsx    # 图片裁剪
│   │   │   │   └── MarkdownViewer.tsx  # Markdown 只读渲染
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx       # 整体布局（顶栏 + 侧栏 + 算24悬浮按钮）
│   │   │   │   └── ProtectedRoute.tsx  # 登录守卫
│   │   │   ├── richEditor/
│   │   │   │   └── MarkdownEditor.tsx  # Markdown 编辑器（KaTeX + 图片上传）
│   │   │   └── game24/
│   │   │       ├── Game24Provider.tsx      # 开关状态 Context（后端 UserConfig）
│   │   │       ├── Game24FloatingButton.tsx# 可拖拽悬浮图标（位置 localStorage 记忆）
│   │   │       └── Game24Modal.tsx         # 游戏窗口（练习/挑战双模式）
│   │   ├── game24/
│   │   │   └── engine.ts              # 算24引擎（token 表达式/有理数求值/穷举求解/难度判定/出题）
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx       # 仪表盘（打卡/热力图/通知/概览）
│   │   │   ├── QuestionsPage.tsx       # 错题库列表
│   │   │   ├── QuestionAddPage.tsx     # 添加错题
│   │   │   ├── QuestionDetailPage.tsx  # 错题详情 + 笔记
│   │   │   ├── BatchEditPage.tsx       # 批量编辑（勾选题目批量修改）
│   │   │   ├── OCREntryPage.tsx        # OCR 录入
│   │   │   ├── PDFImportPage.tsx       # PDF 导入
│   │   │   ├── DraftBoxPage.tsx        # 草稿箱
│   │   │   ├── ReviewCenterPage.tsx    # 重做中心（三模式 + 历史）
│   │   │   ├── SelectQuestionsPage.tsx # 选题重做（卡片网格）
│   │   │   ├── ReviewSessionPage.tsx   # 重做作答（前进/后退/Drawer）
│   │   │   ├── ReviewResultPage.tsx    # 重做结果
│   │   │   ├── StatsPage.tsx           # 统计图表
│   │   │   ├── AIChatPage.tsx          # AI 独立对话页
│   │   │   ├── SettingsPage.tsx        # 设置（多 Tab）
│   │   │   └── ProfilePage.tsx         # 个人资料
│   │   ├── store/
│   │   │   └── AuthContext.tsx         # 认证状态（useReducer）
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript 类型定义
│   │   ├── utils/
│   │   │   ├── markdown.ts            # Markdown 渲染（markdown-it + DOMPurify + KaTeX）
│   │   │   ├── sse.ts                 # SSE 流式处理公用方法
│   │   │   └── errorReporter.ts       # 前端错误上报
│   │   ├── config.ts                  # API 地址配置
│   │   ├── App.tsx                    # 路由定义
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts                 # Vite 配置（代理、代码分包）
│   └── package.json
│
├── backend/                           # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py                    # 入口（CORS、限流、路由注册、静态文件、健康检查）
│   │   ├── config.py                  # pydantic-settings（含 Fernet key 校验）
│   │   ├── database.py                # SQLAlchemy 引擎 + Session
│   │   ├── dependencies.py            # get_current_user（JWT + token_version + token_family）
│   │   ├── models/                    # 16 个 ORM 模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── subject.py
│   │   │   ├── question_type.py
│   │   │   ├── question.py
│   │   │   ├── tag.py
│   │   │   ├── question_tag.py
│   │   │   ├── question_image.py
│   │   │   ├── question_draft.py
│   │   │   ├── question_note.py       # 题目笔记
│   │   │   ├── review_record.py
│   │   │   ├── review_session.py
│   │   │   ├── user_config.py
│   │   │   ├── chat_session.py        # AI 对话会话
│   │   │   ├── ai_chat_message.py
│   │   │   ├── daily_streak.py        # 每日打卡
│   │   │   └── fsrs_state.py          # FSRS 记忆状态
│   │   ├── schemas/                   # Pydantic 请求/响应
│   │   │   ├── auth.py
│   │   │   ├── subject.py
│   │   │   ├── tag.py
│   │   │   ├── question.py
│   │   │   └── review.py
│   │   ├── routers/                   # API 路由
│   │   │   ├── auth.py
│   │   │   ├── subjects.py
│   │   │   ├── tags.py
│   │   │   ├── questions.py
│   │   │   ├── ocr.py
│   │   │   ├── draft.py
│   │   │   ├── review.py
│   │   │   ├── ai_chat.py
│   │   │   ├── stats.py
│   │   │   ├── export.py
│   │   │   ├── notes.py               # 笔记 CRUD
│   │   │   └── settings.py
│   │   ├── services/                  # 业务逻辑
│   │   │   ├── auth_service.py
│   │   │   ├── subject_service.py
│   │   │   ├── tag_service.py
│   │   │   ├── question_service.py
│   │   │   ├── review_service.py
│   │   │   ├── ocr_service.py
│   │   │   ├── ai_service.py
│   │   │   ├── fsrs.py                # FSRS 算法（稳定性/难度/间隔计算）
│   │   │   └── hunyuan_ocr.py         # HunyuanOCR 本地模型推理（懒加载单例，需 GPU）
│   │   ├── utils/
│   │   │   ├── security.py            # JWT/bcrypt/Fernet
│   │   │   └── shared.py             # 公用函数（strip_html, get_user_config）
│   │   └── migrations/               # Alembic 迁移
│   ├── uploads/                       # 文件存储
│   ├── logs/                          # 日志文件
│   ├── alembic.ini
│   ├── requirements.txt                # 核心依赖
│   └── requirements-ocr.txt            # OCR 依赖（PaddleOCR/PyMuPDF/torch+CUDA）
│
├── REQUIREMENTS.md                    # 需求文档
├── TECHNICAL_DESIGN.md                # 本文件
└── CLAUDE.md                          # AI 助手指南
```

---

## 2. 数据库设计

### 2.1 表总览

| 表 | 说明 | 关键字段 |
|---|------|---------|
| `user` | 用户 | username, email, password_hash, token_version, token_family, avatar_url |
| `subject` | 学科 | user_id, name, color |
| `question_type` | 题型 | subject_id, user_id, name |
| `tag` | 标签 | user_id, name, color |
| `question` | 错题 | user_id, subject_id, content, content_plain, answer(JSON), is_deleted |
| `question_tag` | 题目标签关联 | question_id, tag_id |
| `question_image` | 配图 | question_id, file_path |
| `question_draft` | 草稿 | user_id, subject_id, content, answer, tag_ids(JSON), ocr_text |
| `question_note` | 笔记 | user_id, question_id, content(TEXT) |
| `review_record` | 作答记录 | user_id, question_id, session_id, is_correct, review_mode(ENUM) |
| `review_session` | 重做会话 | user_id, review_mode(ENUM), question_ids(JSON), current_index |
| `chat_session` | AI 对话 | user_id, question_id(NULLABLE), title |
| `ai_chat_message` | AI 消息 | session_id, user_id, role(ENUM), content |
| `user_config` | 用户配置 | user_id, config_key, config_value |
| `daily_streak` | 打卡记录 | user_id, date(UNIQUE) |
| `fsrs_state` | FSRS 状态 | user_id, question_id(UNIQUE), stability, difficulty, next_review_at |

### 2.2 关键设计

**`answer` 字段**：JSON 字符串，按题型不同结构：

```json
// 选择题
{"options": ["A. 选项一", ...], "correct": ["A", "C"]}
// 填空题
{"blanks": ["答案1", "答案2"]}
// 主观题
{"reference": "参考答案（HTML）"}
```

**`review_mode` ENUM**：`'free'`, `'spaced'`, `'select'`（选题重做）

**`review_session`**：
- `question_ids` (JSON): 存储题目 ID 列表，支持断点续练
- `current_index`: 当前完成题数，恢复时从该位置继续
- `finished_at` NULL = 未完成

**`user_config` 键值**：

| key | 示例值 |
|-----|--------|
| `fsrs_retention` | `0.90` |
| `ai_api_url` | `https://api.openai.com/v1` |
| `ai_api_key` | Fernet 加密存储 |
| `ai_model` | `gpt-4o` |
| `game24_enabled` | `true` / `false` |

---

## 3. 后端 API

### 3.1 通用约定

- **Base URL**: `/api`
- **认证**: Header `Authorization: Bearer <access_token>`
- **响应**: `{ data: ... }` 或 `{ detail: "..." }`
- **状态码**: 200/201/204/400/401/404/409/500/503

### 3.2 认证 (`/api/auth`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/register` | 注册（自动创建默认学科题型） |
| POST | `/login` | 登录，返回 access+refresh token |
| POST | `/refresh` | 刷新 token（token_version 递增，旧 token 失效） |
| POST | `/logout` | 登出（更换 token_family，吊销全部已签发 token） |
| GET | `/me` | 当前用户信息 |

### 3.3 学科/题型/标签 (`/api`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/subjects` | 学科列表（含题型和题数，批量 count） |
| POST | `/subjects` | 创建学科 |
| PUT | `/subjects/{id}` | 编辑学科 |
| DELETE | `/subjects/{id}` | 删除学科（有错题则禁止） |
| POST | `/subjects/{id}/types` | 创建题型 |
| PUT | `/types/{id}` | 编辑题型 |
| DELETE | `/types/{id}` | 删除题型 |
| GET | `/tags` | 标签列表 |
| POST | `/tags` | 创建标签 |
| PUT | `/tags/{id}` | 编辑标签 |
| DELETE | `/tags/{id}` | 删除标签 |

### 3.4 错题 (`/api/questions`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/questions` | 列表（筛选/搜索/分页，含 batch stats） |
| GET | `/questions/{id}` | 详情（含 tags, subject, type, stats） |
| POST | `/questions` | 创建 |
| PUT | `/questions/{id}` | 编辑 |
| DELETE | `/questions/{id}` | 软删除 |
| POST | `/batch-delete` | 批量删除 |
| PUT | `/batch-tag` | 批量改标签 |
| POST | `/upload/image` | 上传配图 |

### 3.5 OCR/AI 解析 (`/api`)

双引擎：`engine` 参数 `hunyuan`（默认，本地模型推理，需 GPU）或 `paddle`（本地 PaddleOCR，CPU）。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/ocr/recognize` | OCR 识别（支持裁剪+旋转，按图片 file_id） |
| POST | `/ocr/parse` | AI 结构化解析（单题） |
| POST | `/ocr/parse-batch` | AI 多题拆分解析（返回题目数组） |
| POST | `/pdf/ocr` | PDF 全流程：渲染（≤30 页）→ 逐页 OCR → AI 多题拆分 |
| POST | `/pdf/extract` | PDF 文本提取 |

### 3.6 草稿 (`/api/drafts`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `` | 草稿列表（最多 100 份，超出自动删最旧） |
| GET | `/{id}` | 草稿详情 |
| POST | `` | 保存草稿 |
| DELETE | `/{id}` | 删除草稿 |
| POST | `/{id}/convert` | 转为错题（含标签迁移+answer 规范化） |

### 3.7 笔记 (`/api`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/questions/{id}/notes` | 获取笔记列表 |
| POST | `/questions/{id}/notes` | 新增笔记 |
| PUT | `/notes/{id}` | 编辑笔记 |
| DELETE | `/notes/{id}` | 删除笔记 |

### 3.8 重做 (`/api/review`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sessions` | 历史会话列表（20 条） |
| POST | `/sessions` | 创建重做会话（支持 question_ids） |
| GET | `/sessions/{id}` | 会话详情 |
| GET | `/sessions/{id}/resume` | 断点续练（返回有序题目+已作答标记） |
| POST | `/sessions/{id}/submit` | 提交答案（双阶段：获取答案 → 判分存记录） |
| PUT | `/sessions/{id}/finish` | 结束会话 |
| GET | `/today-pending` | 今日待复习数量 |

**submit 请求体**：
```json
{
  "question_id": 100,
  "user_answer": "JSON 字符串",
  "is_correct": null,      // 第一阶段 null, 第二阶段 true/false
  "current_index": 2,      // 已完成题数
  "rating": 3              // FSRS 评分 1-4
}
```

### 3.9 AI 答疑 (`/api/chat`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sessions` | 对话会话列表 |
| POST | `/sessions` | 创建新对话 |
| GET | `/sessions/{id}/messages` | 获取消息（过滤 system） |
| POST | `/sessions/{id}/send` | 发送消息（SSE 流式响应） |
| PUT | `/sessions/{id}/bind` | 绑定/解绑题目 |
| DELETE | `/sessions/{id}` | 删除对话 |

### 3.10 统计 (`/api/stats`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dashboard` | 仪表盘数据（含今日待复习） |
| GET | `/overview` | 全局概览 |
| GET | `/trends` | 正确率趋势（?days=7/30） |
| GET | `/subjects-breakdown` | 学科统计（合并查询消除 N+1） |
| GET | `/streak` | 打卡统计（连续/最长/累计/90 天日历） |

### 3.11 导出 (`/api/export`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/data` | 导出（json/json_with_images/pdf） |

### 3.12 设置 (`/api/settings`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/fsrs-retention` | 获取 FSRS 保留率 |
| PUT | `/fsrs-retention` | 更新保留率（clamp 0.70-0.99） |
| GET | `/ai-config` | 获取 AI 配置（Key 脱敏） |
| PUT | `/ai-config` | 更新 AI 配置 |
| GET | `/game24-enabled` | 获取算24游戏开关（默认 false） |
| PUT | `/game24-enabled` | 更新算24游戏开关 |
| PUT | `/user-info` | 修改用户信息 |
| PUT | `/password` | 修改密码 |
| POST | `/avatar` | 上传头像 |

---

## 4. FSRS 算法

### 4.1 核心概念

| 参数 | 说明 | 初始值 |
|------|------|--------|
| Stability (S) | 记忆牢固程度（天） | 0.5 |
| Difficulty (D) | 题目难度（0-1） | 0.5 |
| Retrievability (R) | 记忆可提取概率 | 1.0 |
| 目标保留率 | 用户期望的记忆保持水平 | 0.90 |

### 4.2 评分映射

```
完全忘了 → rating=1 (Again)   → S 大幅衰减
勉强想起 → rating=2 (Hard)    → S 小幅增长
顺利答对 → rating=3 (Good)    → S 正常增长
太简单了 → rating=4 (Easy)    → S 加速增长
```

### 4.3 核心公式

```python
# 可提取性
R = exp(ln(0.9) * elapsed_days / stability)

# 难度更新
D' = clamp(D + delta * (rating_to_diff - D), 0.3, 0.95)

# 稳定性更新（按 rating 分四种情况）
# Again:  S' = S * max(0.3, 1 - 0.7 * D)
# Hard:   S' = S * (1 + 0.15 * exp(-3 * D))
# Good:   S' = S * (1 + (exp(0.5*(1-R)) - 1) * (1 - D*0.5))
# Easy:   S' = S * (1 + (exp(1-R) - 1) * (1 - D*0.3))

# 间隔计算
interval = S' * ln(retention) / ln(0.9)
```

### 4.4 到期查询

```python
# fsrs_state.next_review_at <= now() 的题目到期
# 从未有过 FSRS 状态的题目（首次出现）也一律到期
```

---

## 5. 前端关键技术方案

### 5.1 JWT 续期（Axios 拦截器）

```ts
// client.ts
请求拦截器 → 自动附加 Authorization: Bearer {accessToken}
响应拦截器 → 401 时：
  1. refresh_token 换新 token
  2. 成功: processQueue(token), 重试原请求
  3. 失败: 清除状态, 跳转 /login
```

### 5.2 SSE 流式处理（共享工具）

```ts
// utils/sse.ts
export async function streamSSE(url, body, { onToken, onDone, onError })
// 用于 AI 答疑流式响应，AIChatPage 使用
```

### 5.3 Markdown 渲染（DOMPurify + KaTeX）

```ts
// utils/markdown.ts
export function renderMarkdown(text: string): string
// 1. 保护 ```代码块 → 2. $$..$$ 块级公式 → 3. $..$ 行内公式 → 3.5 裸 LaTeX 命令（如 \frac{}{}）
// 4. markdown-it 渲染 → 5. 还原占位符 → DOMPurify 净化（白名单含 KaTeX 数学标签）→ 输出安全 HTML
// 占位符用 Unicode 私用区字符（PUA），不受 markdown/HTML 解析干扰
```

### 5.4 骨架屏 & 乐观更新

- **骨架屏**：Dashboard 和 QuestionDetail 页面加载时使用 Ant Design `<Skeleton>` 替代 Spin
- **乐观更新**：笔记删除、草稿删除、会话结束时先更新本地状态，API 失败后回滚

### 5.5 复习断点续练

```
创建会话 → question_ids 存入 review_session
每答一题 → current_index = currentIdx + 1 写入 DB
断线/关闭 → finished_at 保持 NULL
回到重做中心 → 右侧历史列表显示"进行中"
点继续 → /resume 接口返回有序题目 + answered 标记
         → 跳到 current_index 位置继续
```

### 5.6 答题区域内导航

- `history` Map 缓存每题作答状态（答案/判分/解析）
- "上一题"还原缓存的只读结果，"下一题"恢复或新建
- 已答题不可重新作答

### 5.7 算24小游戏

纯前端实现（无后端求解），分三层：

**`game24/engine.ts`（纯逻辑，无 React）**
- `Token` 联合类型：数字/运算符/括号，表达式以 **token 数组**而非字符串拼接，杜绝两位数（11/13）歧义
- `Fraction` 有理数类（num/den + gcd 约分），求值全程零浮点误差，`8÷(3−8÷3)` 精确得 24
- `parseAndEval(tokens)`：递归下降求值器（×÷ 优先于 +−，括号，语法错误抛异常），不用 eval
- `solve(nums)`：穷举 4 数唯一排列 × 4³ 运算符 × 5 种括号形态 = 7680 次，排除除数为 0；返回首个解 + 是否存在全程整数中间结果的解
- `classify(nums)`：难度判定——仅分数解 → hard；有整数解且 max≤9 → easy；max≤10 → medium；其余无解
- `generate(difficulty)`：随机采样 + 求解器过滤，重试上限 500 次，失败回退手工验证过的种子题池
- `validateExpression(tokens, nums)`：校验"数字多重集合恰好等于题目 4 个数 + 语法合法 + 结果 = 24"

**组件层（`components/game24/`）**
- `Game24Provider`：Context 提供开关状态，挂载时 GET `/api/settings/game24-enabled`，切换时乐观更新 + PUT，失败回滚
- `Game24FloatingButton`：fixed 定位左下角，pointer 事件拖拽 + `setPointerCapture` + `touch-action:none`，位移 <5px 判点击，位置 clamp 视口并持久化 localStorage（`game24_fab_pos`）
- `Game24Modal`：`closable={false}`（关闭按钮内置于自定义头部，避免遮挡模式切换）；模式 Segmented（练习/挑战）；练习：难度切换/看答案/换题；挑战：状态机 `idle→running→finished`，deadline 用 `Date.now()` 差值倒计时（interval 250ms），答对 +10 分即时换题，答错连击清零红反馈 1.2s 后自动换题（防刷分，挑战中禁用看答案/换题）；Modal `destroyOnHidden` 关闭即重置

**开关后端**：`GET/PUT /api/settings/game24-enabled`，复用 `_get_or_create_config`，config_key `game24_enabled`，值 `"true"/"false"`，无新表

---

## 6. 部署

### 6.1 开发环境

```bash
# 后端
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd frontend
npm install && npm run dev
# Vite 代理 /api → localhost:8000
```

### 6.2 环境变量

```env
# backend/.env
DATABASE_URL=mysql+pymysql://user:pass@localhost:3306/wrong_questions
JWT_SECRET=<random-string>
ENCRYPTION_KEY=<fernet-key>    # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
UPLOAD_ROOT=uploads
CORS_ORIGINS=http://localhost:5173   # 逗号分隔的允许来源列表
HUNYUAN_MODEL_DIR=D:/AI_code/hunyuanOCR/HunyuanOCR   # HunyuanOCR 本地模型目录（默认引擎需要）
DEBUG=false

# 前端通过 VITE_API_BASE_URL 配置 API 地址（默认 /api）
```

### 6.3 健康检查

```json
// GET /api/health
{"status": "ok", "database": "connected"}
// 数据库连接失败时返回 503
```
