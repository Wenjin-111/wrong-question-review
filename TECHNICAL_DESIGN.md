# 错题收集与重做系统 - 技术设计文档

## 1. 项目结构

```
错题快速收集/
├── frontend/                    # React 前端
│   ├── public/
│   ├── src/
│   │   ├── api/                 # Axios 封装 + 各模块 API 调用
│   │   │   ├── client.ts        # Axios 实例（baseURL、拦截器、JWT 续期）
│   │   │   ├── auth.ts          # 登录/注册/用户信息
│   │   │   ├── subjects.ts      # 学科 & 题型 CRUD
│   │   │   ├── questions.ts     # 错题 CRUD
│   │   │   ├── review.ts        # 重做相关
│   │   │   ├── stats.ts         # 统计数据
│   │   │   ├── ocr.ts           # OCR 识别 & AI 解析
│   │   │   ├── aiChat.ts        # AI 答疑对话
│   │   │   ├── export.ts        # 导出 PDF
│   │   │   └── settings.ts      # 用户设置
│   │   ├── components/          # 公共组件
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx         # 整体布局（顶栏 + 侧栏 + 内容区）
│   │   │   │   └── ProtectedRoute.tsx    # 登录守卫
│   │   │   ├── richEditor/
│   │   │   │   ├── TiptapEditor.tsx      # 富文本编辑器（封装 TipTap）
│   │   │   │   └── TiptapViewer.tsx      # 富文本只读渲染
│   │   │   ├── ImageCropper.tsx          # 图片框选裁剪组件
│   │   │   ├── AiChatPanel.tsx           # AI 对话面板（可复用）
│   │   │   ├── ReviewCard.tsx            # 重做答题卡片（按题型渲染不同作答区）
│   │   │   └── StatCard.tsx              # 统计数字卡片
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx         # 首页仪表盘
│   │   │   ├── QuestionsPage.tsx         # 错题库列表
│   │   │   ├── QuestionAddPage.tsx       # 添加错题（手动/OCR/PDF 入口合一）
│   │   │   ├── QuestionDetailPage.tsx    # 错题详情 + AI 答疑
│   │   │   ├── ReviewCenterPage.tsx      # 重做中心（筛选条件）
│   │   │   ├── ReviewSessionPage.tsx     # 重做进行中
│   │   │   ├── ReviewResultPage.tsx      # 重做结果
│   │   │   ├── StatsPage.tsx             # 详细统计
│   │   │   └── SettingsPage.tsx          # 设置（含多个 Tab）
│   │   ├── hooks/                # 自定义 Hooks
│   │   ├── store/                # Context 状态
│   │   │   └── AuthContext.tsx           # 用户登录状态
│   │   ├── types/                # TypeScript 类型定义
│   │   │   └── index.ts
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                     # Python FastAPI 后端
│   ├── app/
│   │   ├── main.py              # FastAPI 入口，挂载路由，CORS 配置
│   │   ├── config.py            # 配置（数据库连接、JWT密钥、上传路径等）
│   │   ├── database.py          # SQLAlchemy 引擎 & Session
│   │   ├── dependencies.py      # 依赖注入（get_db、get_current_user）
│   │   ├── models/              # SQLAlchemy ORM 模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── subject.py
│   │   │   ├── question_type.py
│   │   │   ├── question.py
│   │   │   ├── tag.py
│   │   │   ├── review_record.py
│   │   │   └── ai_chat_message.py
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── question.py
│   │   │   ├── review.py
│   │   │   ├── stats.py
│   │   │   ├── ocr.py
│   │   │   ├── ai_chat.py
│   │   │   └── settings.py
│   │   ├── routers/             # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── subjects.py
│   │   │   ├── questions.py
│   │   │   ├── review.py
│   │   │   ├── stats.py
│   │   │   ├── ocr.py
│   │   │   ├── ai_chat.py
│   │   │   ├── export.py
│   │   │   └── settings.py
│   │   ├── services/            # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── question_service.py
│   │   │   ├── review_service.py
│   │   │   ├── stats_service.py
│   │   │   ├── ocr_service.py
│   │   │   ├── ai_service.py
│   │   │   └── export_service.py
│   │   ├── utils/
│   │   │   ├── security.py      # JWT 生成/验证、密码哈希
│   │   │   ├── image_utils.py   # 图片裁剪、压缩
│   │   │   └── file_storage.py  # 本地文件存储读写
│   │   └── migrations/          # Alembic 数据库迁移
│   ├── uploads/                 # 上传文件存储目录（.gitignore）
│   │   ├── images/
│   │   └── pdfs/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── pyproject.toml
│
├── REQUIREMENTS.md              # 需求文档
├── TECHNICAL_DESIGN.md          # 本文件
└── .gitignore
```

---

## 2. 数据库设计

### 2.1 ER 关系概览

```
user (1) ────────< (N) subject ────────< (N) question_type
  │                    │                       │
  │                    │                       │
  │                    ├───────────────────────┘
  │                    │
  │ (1) ──────< (N) question (N) >────── (N) tag
  │                    │
  │                    │ (1) ──────< (N) review_record
  │                    │
  │                    │ (1) ──────< (N) ai_chat_message
  │                    │
  │ (1) ──────< (N) user_config
```

### 2.2 表结构

#### `user` — 用户表
```sql
CREATE TABLE user (
    id            INT           PRIMARY KEY AUTO_INCREMENT,
    username      VARCHAR(20)   NOT NULL UNIQUE,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### `subject` — 学科表
```sql
CREATE TABLE subject (
    id         INT           PRIMARY KEY AUTO_INCREMENT,
    user_id    INT           NOT NULL,
    name       VARCHAR(50)   NOT NULL,
    color      VARCHAR(7)    DEFAULT '#1677ff',   -- 学科标记颜色
    sort_order INT           DEFAULT 0,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);
```

#### `question_type` — 题型表
```sql
CREATE TABLE question_type (
    id         INT           PRIMARY KEY AUTO_INCREMENT,
    subject_id INT           NOT NULL,
    user_id    INT           NOT NULL,
    name       VARCHAR(50)   NOT NULL,
    sort_order INT           DEFAULT 0,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subject(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE (subject_id, name)
);
```

#### `tag` — 标签表
```sql
CREATE TABLE tag (
    id         INT           PRIMARY KEY AUTO_INCREMENT,
    user_id    INT           NOT NULL,
    name       VARCHAR(30)   NOT NULL,
    color      VARCHAR(7)    DEFAULT '#1677ff',
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);
```

#### `question` — 错题表
```sql
CREATE TABLE question (
    id                INT           PRIMARY KEY AUTO_INCREMENT,
    user_id           INT           NOT NULL,
    subject_id        INT           NOT NULL,
    question_type_id  INT           NOT NULL,
    content           TEXT          NOT NULL,           -- 题目内容（HTML，富文本编辑器输出）
    content_plain     TEXT          DEFAULT NULL,       -- 题目纯文本（去 HTML 标签，用于全文搜索，触发器自动同步）
    answer            TEXT          NOT NULL,           -- 正确答案（JSON 字符串，按题型不同结构）
    explanation       TEXT          DEFAULT NULL,       -- 解析（HTML）
    source            VARCHAR(255)  DEFAULT NULL,       -- 来源
    is_deleted        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)          REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id)       REFERENCES subject(id) ON DELETE RESTRICT,  -- 学科下有错题时禁止删除学科
    FOREIGN KEY (question_type_id) REFERENCES question_type(id) ON DELETE RESTRICT,
    INDEX idx_user_subject (user_id, subject_id),
    INDEX idx_user_deleted (user_id, is_deleted),
    FULLTEXT INDEX ft_content_plain (content_plain)   -- 对纯文本列建全文索引，避免 HTML 标签干扰搜索
);
```

**`answer` 字段按题型不同存储格式**：
```json
// 选择题
{"options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"], "correct": ["A", "C"]}
// 填空题
{"blanks": ["答案1", "答案2"]}
// 主观题/客观题
{"reference": "参考答案文本（富文本HTML），供用户自评参考"}
```

**`content` 字段说明**：
- 存储 TipTap 编辑器输出的 HTML 字符串
- 题目中嵌入的图片以 URL 形式存储在 HTML 中（如 `<img src="/uploads/images/xxx.png">`）
- 数学公式用 LaTeX 存储（如 `\(x^2 + y^2 = z^2\)`），前端 KaTeX/MathJax 渲染

**`content_plain` 字段说明**：
- 由后端在保存/更新题目时自动从 `content` 提取纯文本（strip HTML tags）
- 用于 MySQL FULLTEXT 全文搜索，避免 HTML 标签干扰搜索匹配
- 前端搜索请求的 `keyword` 参数对此列做全文检索

#### `question_tag` — 题目-标签关联表
```sql
CREATE TABLE question_tag (
    question_id INT NOT NULL,
    tag_id      INT NOT NULL,
    PRIMARY KEY (question_id, tag_id),
    FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)      REFERENCES tag(id) ON DELETE CASCADE
);
```

#### `review_record` — 作答记录表
```sql
CREATE TABLE review_record (
    id              INT           PRIMARY KEY AUTO_INCREMENT,
    user_id         INT           NOT NULL,
    question_id     INT           NOT NULL,
    is_correct      BOOLEAN       NOT NULL,               -- 是否正确（主观题为用户自评结果）
    user_answer     TEXT          DEFAULT NULL,           -- 用户提交的答案（JSON 字符串）
    review_mode     ENUM('free','spaced') NOT NULL,       -- 自由模式 / 遗忘曲线模式
    sr_stage        INT           DEFAULT NULL,           -- 本次作答后在遗忘曲线的第几阶段（NULL=自由模式）
    sr_next_review  DATETIME      DEFAULT NULL,           -- 下次复习时间（NULL=自由模式）
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE,
    INDEX idx_user_question (user_id, question_id),
    INDEX idx_sr_next_review (user_id, sr_next_review)
);
```

#### `review_session` — 一轮重做练习会话表
```sql
CREATE TABLE review_session (
    id              INT           PRIMARY KEY AUTO_INCREMENT,
    user_id         INT           NOT NULL,
    review_mode     ENUM('free','spaced') NOT NULL,
    subject_ids     JSON          NOT NULL,               -- 本次练习涉及的学科 ID 列表
    total_count     INT           NOT NULL,
    correct_count   INT           NOT NULL DEFAULT 0,
    wrong_count     INT           NOT NULL DEFAULT 0,
    started_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at     DATETIME      DEFAULT NULL,           -- 完成时间
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

#### `ai_chat_message` — AI 答疑对话记录表
```sql
CREATE TABLE ai_chat_message (
    id           INT           PRIMARY KEY AUTO_INCREMENT,
    user_id      INT           NOT NULL,
    question_id  INT           NOT NULL,
    role         ENUM('user','assistant','system') NOT NULL,  -- 消息角色
    content      TEXT          NOT NULL,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE CASCADE,
    INDEX idx_question (question_id, created_at)
);
```

#### `user_config` — 用户配置表（键值对）
```sql
CREATE TABLE user_config (
    id         INT           PRIMARY KEY AUTO_INCREMENT,
    user_id    INT           NOT NULL,
    config_key VARCHAR(50)   NOT NULL,                    -- 配置项：spaced_intervals / ai_api_url / ai_api_key / ai_model
    config_value TEXT        NOT NULL,                    -- 配置值（JSON 字符串或纯文本）
    updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE (user_id, config_key)
);
```

**`config_key` 枚举**：
| config_key | config_value 示例 |
|---|---|
| `spaced_intervals` | `[20, 60, 1440, 2880, 8640, 44640]`（分钟） |
| `ai_api_url` | `https://api.openai.com/v1` |
| `ai_api_key` | `sk-xxx...`（**Fernet 对称加密存储**，运行时由服务端环境变量 `ENCRYPTION_KEY` 解密） |
| `ai_model` | `gpt-4o` |

#### `question_image` — 题目配图表（题目内容中的图片追踪）
```sql
CREATE TABLE question_image (
    id           INT           PRIMARY KEY AUTO_INCREMENT,
    user_id      INT           NOT NULL,
    question_id  INT           DEFAULT NULL,              -- NULL=上传了但尚未关联题目（如上传中的临时图）
    file_path    VARCHAR(500)  NOT NULL,                  -- 服务器相对路径
    file_size    INT           NOT NULL,                  -- 字节
    original_name VARCHAR(255) DEFAULT NULL,              -- 原始文件名
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question(id) ON DELETE SET NULL
);
```

#### `export_task` — 导出任务表
```sql
CREATE TABLE export_task (
    id           INT           PRIMARY KEY AUTO_INCREMENT,
    user_id      INT           NOT NULL,
    export_type  ENUM('pdf','json','json_with_images') NOT NULL,
    status       ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
    file_path    VARCHAR(500)  DEFAULT NULL,               -- 导出完成后生成的文件路径
    error_msg    TEXT          DEFAULT NULL,               -- 失败时的错误信息
    filter_params JSON        DEFAULT NULL,               -- 导出时使用的筛选条件
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at  DATETIME      DEFAULT NULL,               -- 完成时间
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status)
);
```

#### `question_draft` — OCR 录入草稿表
```sql
CREATE TABLE question_draft (
    id                INT           PRIMARY KEY AUTO_INCREMENT,
    user_id           INT           NOT NULL,
    subject_id        INT           DEFAULT NULL,
    question_type_id  INT           DEFAULT NULL,
    content           TEXT          DEFAULT NULL,           -- 题目内容（HTML）
    answer            TEXT          DEFAULT NULL,           -- 答案（JSON）
    explanation       TEXT          DEFAULT NULL,           -- 解析（HTML）
    source            VARCHAR(255)  DEFAULT NULL,
    tag_ids           JSON          DEFAULT NULL,           -- 已选标签 ID 列表
    ocr_text          TEXT          DEFAULT NULL,           -- OCR 原始文本
    ai_parse_result   JSON          DEFAULT NULL,           -- AI 解析返回的原始 JSON
    image_file_id     INT           DEFAULT NULL,           -- 关联的上传图片
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_draft (user_id, id),
    INDEX idx_user (user_id)
);
```
> 每个用户最多保留 5 份草稿，超过时自动删除最旧的。草稿不要求必填字段完整，可随时保存。

---

## 3. 后端 API 设计

### 3.1 通用约定

- **Base URL**: `http://localhost:8000/api`
- **认证方式**: 除 `/api/auth/login` 和 `/api/auth/register` 外，所有接口需在 Header 中携带 `Authorization: Bearer <access_token>`
- **响应格式**:
  ```json
  // 成功（HTTP 200/201）
  { "data": {...}, "message": "ok" }
  // 列表
  { "data": { "items": [...], "total": 100, "page": 1, "page_size": 20 } }
  // 失败（HTTP 4xx/5xx）
  { "detail": "错误描述" }
  ```
- HTTP 状态码语义正确使用：200 OK、201 Created、400 Bad Request、401 Unauthorized、403 Forbidden、404 Not Found、409 Conflict、429 Too Many Requests、500 Internal Server Error

### 3.2 认证模块 `routers/auth.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录，返回 access_token + refresh_token |
| POST | `/api/auth/refresh` | 刷新 access_token |
| GET | `/api/auth/me` | 获取当前用户信息 |
| PUT | `/api/auth/me` | 修改当前用户信息（用户名、邮箱） |
| PUT | `/api/auth/password` | 修改密码 |

**POST /api/auth/login 请求体**:
```json
{ "login": "用户名或邮箱", "password": "密码" }
```
**响应**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": { "id": 1, "username": "zhangsan", "email": "zs@example.com" }
}
```

### 3.3 学科与题型 `routers/subjects.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subjects` | 学科列表（含每个学科的题型） |
| POST | `/api/subjects` | 创建学科 |
| PUT | `/api/subjects/{id}` | 编辑学科 |
| DELETE | `/api/subjects/{id}` | 删除学科（含题型，弹窗确认） |
| POST | `/api/subjects/{id}/types` | 在学科下创建题型 |
| PUT | `/api/types/{id}` | 编辑题型 |
| DELETE | `/api/types/{id}` | 删除题型 |

### 3.4 标签 `routers/subjects.py`（合并到 tags 路由）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tags` | 标签列表 |
| POST | `/api/tags` | 创建标签 |
| PUT | `/api/tags/{id}` | 编辑标签 |
| DELETE | `/api/tags/{id}` | 删除标签 |

### 3.5 错题 CRUD `routers/questions.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/questions` | 错题列表（支持筛选、搜索、分页、排序） |
| GET | `/api/questions/{id}` | 错题详情 |
| POST | `/api/questions` | 创建错题 |
| PUT | `/api/questions/{id}` | 编辑错题 |
| DELETE | `/api/questions/{id}` | 删除错题（软删除） |
| POST | `/api/questions/batch-delete` | 批量删除 |
| PUT | `/api/questions/batch-tag` | 批量修改标签 |

**GET /api/questions 查询参数**:
```
?subject_id=1,2,3          // 学科筛选（逗号分隔）
&type_id=1,2               // 题型筛选
&tag_id=1,2                // 标签筛选
&keyword=三角函数           // 关键词搜索
&accuracy_min=0             // 最低正确率
&accuracy_max=50            // 最高正确率
&date_from=2024-01-01       // 录入时间起
&date_to=2024-12-31         // 录入时间止
&sort=created_at_desc       // 排序字段
&page=1                     // 页码
&page_size=20               // 每页条数（最大50）
```

**POST /api/questions 请求体**:
```json
{
  "subject_id": 1,
  "question_type_id": 2,
  "content": "<p>题目内容 HTML</p>",
  "answer": { "options": ["A. ...", "B. ..."], "correct": ["A"] },
  "explanation": "<p>解析 HTML</p>",
  "source": "2024高考数学卷",
  "tag_ids": [1, 3]
}
```

### 3.6 图片上传 `routers/upload.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload/image` | 上传图片（富文本编辑器使用） |
| POST | `/api/upload/ocr-image` | 上传 OCR 图片（框选后的完整流程入口） |

**POST /api/upload/image**：
- 请求：multipart/form-data，字段 `file`
- 响应：`{ "url": "/uploads/images/2024/01/xxx.png", "file_id": 123 }`
- 支持 jpg/png/bmp/webp，最大 10MB
- 图片存储路径：`uploads/images/{YYYY}/{MM}/{uuid}.{ext}`

### 3.7 OCR & AI 解析 `routers/ocr.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ocr/recognize` | OCR 文字识别（送图片，返回原始文本） |
| POST | `/api/ocr/parse` | AI 结构化解析（送文本，返回题目/答案/解析） |
| POST | `/api/pdf/extract` | PDF 文本提取 |

**POST /api/ocr/recognize** 请求体：
```json
{
  "image_file_id": 123,
  "crop": { "x": 100, "y": 50, "width": 800, "height": 600 },
  "rotation": 0
}
```
**响应**：
```json
{
  "raw_text": "OCR 识别的原始文本内容...",
  "blocks": [
    { "text": "第一行文字", "confidence": 0.95, "bbox": [10, 20, 200, 40] },
    { "text": "第二行文字", "confidence": 0.62, "bbox": [10, 50, 180, 70] }
  ]
}
```

**POST /api/ocr/parse** 请求体：
```json
{
  "ocr_text": "经用户初步修正后的 OCR 文本"
}
```
**响应**：
```json
{
  "question": "提取的题目内容",
  "answer": "提取的正确答案",
  "explanation": "提取的答案解析"
}
```
> 后端调用用户配置的 AI API（`ai_service.py`），按预设 prompt 解析。若某字段为空字符串表示 AI 未识别到。

**POST /api/pdf/extract**：
- 请求：multipart/form-data，字段 `file`（最大 50MB）
- 响应：`{ "pages": [{ "page_num": 1, "text": "...", "images": ["url1", "url2"] }, ...] }`
- PDF 页数上限 200 页，超过则拒绝

### 3.7b 草稿 `routers/draft.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drafts` | 获取当前用户的草稿列表（最多 5 份） |
| GET | `/api/drafts/{id}` | 获取单个草稿详情 |
| POST | `/api/drafts` | 创建/更新草稿（如已有 5 份则删除最旧的） |
| DELETE | `/api/drafts/{id}` | 删除草稿 |
| POST | `/api/drafts/{id}/convert` | 将草稿转为正式错题（执行完整必填校验） |

### 3.8 重做 `routers/review.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/review/sessions` | 创建一轮重做练习（获取题目列表） |
| GET | `/api/review/sessions/{id}` | 获取练习会话详情 |
| POST | `/api/review/sessions/{id}/submit` | 提交一道题的作答（选择题/填空题后端自动判分） |
| PUT | `/api/review/sessions/{id}/self-evaluate` | 主观题自评（用户自行判断对错） |
| PUT | `/api/review/sessions/{id}/finish` | 结束本轮练习 |
| GET | `/api/review/today-pending` | 今日待复习题目数量 |

**POST /api/review/sessions** 请求体：
```json
{
  "review_mode": "spaced",
  "subject_ids": [1, 2],
  "type_ids": [1],
  "tag_ids": [],
  "min_accuracy": 0,
  "limit": 20,
  "order": "random"
}
```
**响应**：
```json
{
  "session_id": 42,
  "questions": [
    {
      "id": 100,
      "content": "<p>题目 HTML</p>",
      "answer": { "options": [...], "correct": ["B"] },
      "question_type": { "id": 1, "name": "选择题" },
      "subject": { "id": 1, "name": "数学" }
    }
  ],
  "total": 20
}
```
> **安全要求**：返回的题目中必须包含正确答案（前端需要用来比对结果），但前端仅在用户提交后才展示。

**POST /api/review/sessions/{id}/submit** 请求体：
```json
{
  "question_id": 100,
  "user_answer": "用户提交的答案（JSON 字符串）"
}
```
> **判分逻辑**：
> - **选择题/填空题**：后端将 `user_answer` 与数据库中正确答案比对，自动判定 `is_correct`，**不信任客户端传入的判分结果**
> - **主观题/客观题**：后端无法自动判定，返回参考答案供用户自评。用户通过 `PUT /api/review/sessions/{id}/self-evaluate` 提交自评结果（`is_correct: true/false`）

**响应**：
```json
{
  "is_correct": true,
  "correct_answer": { ... },
  "explanation": "<p>解析 HTML</p>",
  "sr_next_review": "2024-01-15T10:30:00",
  "need_self_evaluate": false
}
```
> `need_self_evaluate: true` 时，前端显示参考答案 + "我答对了"/"我答错了"按钮，用户点击后调用自评接口。

### 3.9 AI 答疑 `routers/ai_chat.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/questions/{id}/chat/history` | 获取某题的 AI 对话历史 |
| POST | `/api/questions/{id}/chat/send` | 发送消息（支持 SSE 流式响应） |

**POST /api/questions/{id}/chat/send** 请求体：
```json
{ "message": "这个公式是怎么推导出来的？" }
```
- 后端自动拼接题目上下文作为 system prompt
- 响应：SSE 流式输出（`text/event-stream`），前端逐字渲染
- 同时将 user 消息和 assistant 完整回复存储到 `ai_chat_message` 表

### 3.10 统计 `routers/stats.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/dashboard` | 首页仪表盘数据 |
| GET | `/api/stats/overview` | 统计页全局概览 |
| GET | `/api/stats/subjects` | 各学科统计详情 |
| GET | `/api/stats/trends` | 正确率趋势（支持 7/30/全部天） |
| GET | `/api/stats/daily-count` | 每日做题量 |

### 3.11 导出 `routers/export.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/export/pdf` | 导出错题为 PDF |
| GET | `/api/export/pdf/{task_id}/status` | 查询导出任务状态（大文件异步导出） |
| GET | `/api/export/pdf/{task_id}/download` | 下载导出的 PDF |

### 3.12 设置 `routers/settings.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings/spaced-intervals` | 获取遗忘曲线间隔配置 |
| PUT | `/api/settings/spaced-intervals` | 更新遗忘曲线间隔 |
| GET | `/api/settings/ai-config` | 获取 AI 配置（API Key 脱敏返回最后4位） |
| PUT | `/api/settings/ai-config` | 更新 AI 配置 |
| POST | `/api/settings/ai-config/test` | 测试 AI 连接 |

---

## 4. 前端路由与组件设计

### 4.1 路由表

```tsx
<Routes>
  {/* 公开路由 */}
  <Route path="/login"    element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* 需登录的路由 */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/"                element={<DashboardPage />} />
      <Route path="/questions"       element={<QuestionsPage />} />
      <Route path="/questions/add"   element={<QuestionAddPage />} />
      <Route path="/questions/:id"   element={<QuestionDetailPage />} />
      <Route path="/review"          element={<ReviewCenterPage />} />
      <Route path="/review/session"  element={<ReviewSessionPage />} />
      <Route path="/review/result"   element={<ReviewResultPage />} />
      <Route path="/stats"           element={<StatsPage />} />
      <Route path="/settings"        element={<SettingsPage />} />
    </Route>
  </Route>

  {/* 兜底 */}
  <Route path="*" element={<Navigate to="/" />} />
</Routes>
```

### 4.2 核心组件设计

#### `AppLayout.tsx`
```
┌────────────────────────────────────────────────┐
│  Ant Design Layout                              │
│  ┌────────────────────────────────────────────┐ │
│  │  Layout.Header                             │ │
│  │  [Logo] [Menu: 首页|错题库|重做|统计]  [头像下拉] │
│  └────────────────────────────────────────────┘ │
│  ┌──────────┬─────────────────────────────────┐│
│  │ Sider    │  <Outlet />                     ││
│  │ (所有   │                                 ││
│  │  页面   │                                 ││
│  │  统一)  │                                 ││
│  └──────────┴─────────────────────────────────┘│
└────────────────────────────────────────────────┘
```

#### `TiptapEditor.tsx`
封装 TipTap，props：
```ts
interface TiptapEditorProps {
  value: string;           // HTML 内容
  onChange: (html: string) => void;
  placeholder?: string;
  readonly?: boolean;
  imageUploadUrl?: string; // 图片上传接口
}
```
- 工具栏：加粗、斜体、下划线、标题、列表、引用、LaTeX 公式插入、图片插入、撤销、重做
- 图片插入时调用上传 API，插入返回的 URL
- 公式用 `\( ... \)` (行内) 和 `\[ ... \]` (块级) 语法，前端用 KaTeX 渲染

#### `ImageCropper.tsx`
图片框选裁剪组件，props：
```ts
interface ImageCropperProps {
  src: string;             // 图片 URL
  onCrop: (crop: { x, y, width, height }, rotation: number) => void;
  onSkip: () => void;      // 跳过框选，使用整张图
}
```
- 使用 Canvas 或 DOM 实现拖拽选区
- 选区四角可拖拽缩放，内部可拖拽移动
- 旋转按钮（左转/右转 90°）

#### `AiChatPanel.tsx`
AI 对话面板（错题详情页和重做页复用），props：
```ts
interface AiChatPanelProps {
  questionId: number;
  questionContext: string;  // 自动发送给 AI 的题目上下文
  visible: boolean;
  onClose: () => void;
}
```
- 加载该题历史对话
- 消息列表（气泡样式：用户右侧蓝色，AI 左侧灰色）
- AI 回复支持流式渲染（打字机效果）
- 底部输入框 + 发送按钮

#### `ReviewCard.tsx`
重做答题卡片，按题型渲染不同作答区，props：
```ts
interface ReviewCardProps {
  question: ReviewQuestion;
  questionNumber: number;
  totalQuestions: number;
  onSubmit: (questionId: number, userAnswer: any, isCorrect: boolean) => void;
}
```
- 顶部进度条 + 题号
- 题目内容渲染（TipTap readonly）
- 选择题：Radio/Checkbox 选项列表
- 填空题：多个 Input 输入框
- 主观题：TextArea
- 提交按钮 → 显示结果覆盖层（正确/错误 + 解析）
- "下一题"按钮
- 主观题提交后显示参考答案 + "我答对了"/"我答错了"自评按钮

### 4.3 状态管理

采用 React Context + useReducer，仅管理全局必要状态：

```ts
// AuthContext
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}
```

其余页面级数据（题目列表、重做会话、统计数据等）由各页面组件自行管理（useState + useEffect 调 API），不放入全局状态。

---

## 5. 关键技术方案

### 5.1 JWT 认证与自动续期

**Axios 拦截器逻辑**：
```
请求拦截器 → 自动附加 Authorization: Bearer {accessToken}
响应拦截器 → 401 时：
  1. 使用 refresh_token 调用 /api/auth/refresh
  2. 成功后更新 AuthContext 中的 token，重试原请求
  3. 失败则清除登录状态，跳转 /login
```

**Token 存储**：localStorage（前端），后端不维护 session。

### 5.2 OCR + AI 解析流水线

```
前端                          后端
  │                             │
  ├── 上传图片 ────────────────→ 保存图片，返回 file_id + URL
  │                             │
  ├── 用户框选 ────────────────→ POST /api/ocr/recognize
  │   {file_id, crop, rotation} │
  │                             ├── Pillow 按坐标裁剪
  │                             ├── PaddleOCR 识别
  │                             └── 返回 raw_text + blocks(含confidence)
  │                             │
  ├── 用户修正 OCR 文本 ──────→ POST /api/ocr/parse
  │   {ocr_text}                │
  │                             ├── 检查用户 AI 配置
  │                             ├── 构建 prompt（含 OCR 文本）
  │                             ├── 调用 OpenAI 兼容 API
  │                             ├── 解析 JSON 响应
  │                             └── 返回 {question, answer, explanation}
  │                             │
  ├── 用户确认 ───────────────→ POST /api/questions
  │   {完整题目数据}            │
  │                             └── 保存到数据库
```

### 5.3 遗忘曲线到期计算

```python
# services/review_service.py
def get_due_questions(user_id: int, subject_ids: list[int]) -> list[Question]:
    """
    查询到达复习时间的题目：
    1. 选择在遗忘曲线模式下的最近一次 review_record
    2. 若 sr_next_review <= now，则该题到期
    3. 从未做过但有 review_record 的题（sr_stage=0）一律到期
    """
    subquery = (
        select(
            ReviewRecord.question_id,
            func.max(ReviewRecord.created_at).label('latest')
        )
        .where(ReviewRecord.user_id == user_id)
        .where(ReviewRecord.review_mode == 'spaced')
        .group_by(ReviewRecord.question_id)
        .subquery()
    )
    # JOIN 拿到最新的那条记录
    latest_records = (
        db.query(ReviewRecord)
        .join(subquery, ...)
        .filter(ReviewRecord.sr_next_review <= datetime.now())
    )
    # ... 返回对应的 Question
```

### 5.4 图片存储策略

```
uploads/
├── images/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── a1b2c3d4.png    # UUID 命名，防止冲突
│   │   │   └── e5f6g7h8.jpg
│   │   └── 02/
│   └── ...
├── pdfs/
│   └── 2024/01/xxx.pdf
└── temp/                        # 临时文件（上传但未关联题目的图片，定期清理）
```

- 图片按年月分目录，防止单目录文件过多
- 文件名用 UUID，避免冲突和路径猜测
- 前端通过静态文件服务访问：FastAPI 挂载 `/uploads` 目录为静态文件

### 5.5 富文本内容安全

- 题目内容存储 HTML（TipTap 输出）
- 入库前用 `nh3` 库清洗 HTML（bleach 已停止维护，nh3 基于 Rust 实现，更快且活跃维护），保留白名单标签：
  ```
  p, br, strong, em, u, s, h1-h6, ul, ol, li,
  blockquote, code, pre, img, span (仅 math 相关 class)
  ```
- 去除 script、onclick、style 等
- 前端渲染时使用 TipTap readonly 模式或 `dangerouslySetInnerHTML` + DOMPurify（前端做二次清洗，防御纵深）

### 5.6 AI 调用公共方法

```python
# services/ai_service.py
from app.dependencies import get_ai_http_client  # 全局复用的 httpx.AsyncClient 实例

async def call_ai(
    user_id: int,
    messages: list[dict],     # [{"role": "user", "content": "..."}]
    stream: bool = False,     # 是否流式
) -> Union[str, AsyncGenerator]:
    """从 user_config 读取用户 AI 配置，调用 OpenAI 兼容 API"""
    config = get_user_ai_config(user_id)
    client = get_ai_http_client()  # 复用全局连接池，避免每次调用新建 TCP 连接
    response = await client.post(
        f"{config['api_url']}/chat/completions",
        headers={"Authorization": f"Bearer {config['api_key']}"},
        json={
            "model": config["model"],
            "messages": messages,
            "stream": stream
        },
        timeout=30  # 单次请求超时
    )
    ...

async def stream_ai_response(...) -> AsyncGenerator[str, None]:
    """SSE 流式逐块 yield token，透传给前端"""
    ...
```

> **连接池说明**：`get_ai_http_client()` 由 FastAPI `startup` 事件创建并注入为模块级单例，配置 `httpx.Limits(max_connections=20, max_keepalive_connections=10)`，避免每次 AI 调用重新建立 TCP 连接，减少延迟。`ocr_service.py` 和 `ai_chat.py` 均复用此客户端实例。

`ocr_service.py` 和 `ai_chat.py` 的路由均调用 `ai_service.call_ai()`。

### 5.7 PaddleOCR 模型预下载

PaddleOCR 首次运行时会自动下载模型文件（数百 MB），耗时较长。为避免用户首次使用 OCR 功能时的长时间等待：

- **Docker 镜像构建时**：在 Dockerfile 中执行一次预下载脚本，触发模型下载并缓存在镜像层中
  ```dockerfile
  RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='ch', use_gpu=False)"
  ```
- **非 Docker 部署**：在项目启动脚本 `scripts/setup.sh` 中执行相同的预下载命令
- **健康检查**：后端启动时检查 PaddleOCR 模型文件是否存在，若不存在则异步下载并在日志中输出进度
- **CPU 推理**：默认使用 CPU 模式，单页 OCR 预计耗时 1-3 秒（取决于图片大小和 CPU 性能）

### 5.8 API 频率限制

通过 `slowapi`（FastAPI 中间件）实现基于 IP 和用户 ID 的频率限制：

| 端点范围 | 限制 | 说明 |
|----------|------|------|
| `/api/auth/login`, `/api/auth/register` | 5 次/分钟/IP | 防暴力破解 |
| `/api/ocr/*`, `/api/questions/*/chat/*` | 20 次/分钟/用户 | AI 消耗型接口 |
| `/api/*`（其余） | 120 次/分钟/用户 | 通用接口 |

> 超过限制时返回 HTTP 429，响应头包含 `Retry-After` 秒数。

### 5.9 JWT 存储安全

- Token 存储在 `localStorage`，通过 Axios 拦截器自动附加到请求头
- **已知风险**：localStorage 对 XSS 攻击无防护。若富文本 XSS 清洗不足，攻击者可窃取 token
- **缓解措施**：前端 DOMPurify + 后端 nh3 双重 HTML 清洗，CSP 头限制内联脚本执行
- **未来改进**：可迁移到 HttpOnly Cookie 方案，需后端配合设置 Cookie 并处理 CSRF

### 5.10 统计缓存

统计接口数据来自聚合查询（GROUP BY、COUNT、AVG 等），数据量大时查询较重。采用内存缓存降低数据库压力：

```python
# services/stats_service.py
from functools import lru_cache
import time

_stats_cache = {}  # {cache_key: (data, expiry_timestamp)}

def get_cached_or_compute(cache_key: str, compute_fn, ttl: int = 60):
    """若缓存存在且未过期则直接返回，否则执行 compute_fn 并缓存结果"""
    now = time.time()
    if cache_key in _stats_cache:
        data, expiry = _stats_cache[cache_key]
        if now < expiry:
            return data
    data = compute_fn()
    _stats_cache[cache_key] = (data, now + ttl)
    return data
```

- TTL 60 秒，用户数据隔离（cache_key 包含 user_id）
- 用户修改错题/提交重做时主动失效该用户的统计缓存

### 5.11 连续打卡天数计算

```python
# services/stats_service.py
def calc_streak(user_id: int, db: Session) -> int:
    """从今天往前推算连续打卡天数"""
    from datetime import date, timedelta

    # 查询该用户所有作答日期（去重）
    records = (
        db.query(func.date(ReviewRecord.created_at))
        .filter(ReviewRecord.user_id == user_id)
        .distinct()
        .order_by(func.date(ReviewRecord.created_at).desc())
        .all()
    )
    active_dates = {r[0] for r in records}

    streak = 0
    today = date.today()
    for i in range(365):  # 最多回溯一年
        check_date = today - timedelta(days=i)
        if check_date in active_dates:
            streak += 1
        else:
            break  # 中断则停止
    return streak
```

### 5.12 数据库索引补充

除各表已定义的单列索引外，以下复合索引用于优化高频查询：

```sql
-- 统计查询：按学科聚合用户作答记录
CREATE INDEX idx_rr_user_subject ON review_record(user_id, created_at);

-- 遗忘曲线到期查询
CREATE INDEX idx_rr_user_sr ON review_record(user_id, review_mode, sr_next_review);

-- 错题列表排序
CREATE INDEX idx_q_user_created ON question(user_id, is_deleted, created_at DESC);

-- AI 对话历史查询
CREATE INDEX idx_ai_chat ON ai_chat_message(question_id, created_at);
```

---

## 6. 日志与监控

### 6.1 后端日志

使用 `loguru` 替代标准 `logging`，配置在 `app/main.py` 的 startup 事件中：

```python
# app/main.py
from loguru import logger
import sys

@app.on_event("startup")
def setup_logging():
    logger.remove()  # 移除默认 handler
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> | <level>{message}</level>",
        level="DEBUG" if settings.DEBUG else "INFO",
    )
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        rotation="00:00",          # 每天轮转
        retention="30 days",       # 保留 30 天
        encoding="utf-8",
        level="INFO",
    )
```

### 6.2 关键日志埋点

| 场景 | 日志内容 | 级别 |
|------|----------|------|
| 用户登录/登出 | `user_id`, `ip` | INFO |
| 错题 CRUD | `user_id`, `question_id`, 操作类型 | INFO |
| OCR 识别 | `file_id`, 耗时, 整体置信度, 文字块数 | INFO |
| AI API 调用 | `user_id`, 模型名, 耗时, HTTP 状态码, token 用量（若返回） | INFO |
| 异常捕获 | 完整 traceback + 请求上下文 | ERROR |
| OCR 识别失败 | `file_id`, 错误原因 | WARNING |
| AI 返回格式异常 | `user_id`, 原始响应摘要 | WARNING |

### 6.3 前端错误上报

前端全局捕获未处理的错误，静默上报到后端：

```ts
// utils/errorReporter.ts
window.onerror = (message, source, lineno, colno, error) => {
  axios.post('/api/log/frontend', {
    message: String(message),
    source,
    lineno,
    colno,
    stack: error?.stack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }).catch(() => {}); // 静默失败，不影响用户操作
};
```

后端对应路由 `POST /api/log/frontend`（无需认证，频率限制 10次/分钟/IP），日志写入 `logs/frontend_{date}.log`。

---

## 7. Docker 部署

### 7.1 Docker Compose 编排

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: wrong_questions
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: mysql+pymysql://root:${MYSQL_ROOT_PASSWORD}@db:3306/wrong_questions
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      UPLOAD_ROOT: /app/uploads
      DEBUG: "false"
    volumes:
      - uploads:/app/uploads
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mysql_data:
  uploads:
```

### 7.2 后端 Dockerfile（关键步骤）

```dockerfile
FROM python:3.12-slim

# PaddleOCR 系统依赖
RUN apt-get update && apt-get install -y \
    libgomp1 libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# 预下载 PaddleOCR 模型到镜像层
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='ch', use_gpu=False)"

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7.3 备份建议

- **数据库**：每日凌晨定时执行 `mysqldump`，备份文件保存到 `/backups/db/` 目录（建议挂载到宿主机或云存储）
- **上传文件**：`uploads/` 目录建议挂载宿主机路径或使用对象存储，定期 rsync 到备份位置
- **备份脚本**：`scripts/backup.sh`，可通过 cron 或 Docker 定时任务触发

---

## 8. 实施阶段

### 阶段 1：项目脚手架 + 用户认证
- 初始化前端项目（Vite + React + Ant Design + React Router）
- 初始化后端项目（FastAPI + SQLAlchemy + Alembic）
- 实现 user 表、注册/登录/登出 API
- 前端登录/注册页 + AuthContext + ProtectedRoute
- **可测试**：能注册、登录、访问受保护页面

### 阶段 2：学科 & 题型 & 标签管理
- subject / question_type / tag 表 + CRUD API
- 前端设置页（学科管理、题型管理、标签管理 Tab）
- 注册时自动创建默认数据
- **可测试**：能创建/编辑/删除学科、题型、标签

### 阶段 3：错题 CRUD + 手动录入
- question / question_tag 表 + CRUD API
- 图片上传 API + 本地存储
- TipTap 富文本编辑器集成
- 前端：错题库列表页、添加/编辑页、详情页
- 列表筛选、搜索、分页、排序
- **可测试**：能手写录入、编辑、查看、删除错题

### 阶段 4：OCR + AI 智能解析
- PaddleOCR 集成 + 模型预下载
- 图片框选组件
- AI 解析服务 + /api/ocr/parse
- PDF 文本提取（含页数上限）
- 草稿暂存功能（question_draft 表 + 相关 API）
- 前端：OCR 录入完整流程页面（含草稿恢复入口）
- **可测试**：拍照 → 框选 → OCR → AI 解析 → 确认保存；保存草稿后关闭再打开恢复

### 阶段 5：重做功能
- review_session / review_record 表
- 重做相关 API（创建会话、提交答案、结束）
- 遗忘曲线到期计算逻辑
- 前端：重做中心 → 逐题作答 → 结果页
- **可测试**：选择题 + 填空题 + 主观题完整作答流程

### 阶段 6：AI 答疑
- ai_chat_message 表 + API
- AI 流式 SSE 透传
- 前端：AiChatPanel（错题详情页 + 重做页嵌入）
- **可测试**：对一道题发起多轮 AI 对话

### 阶段 7：统计 & 仪表盘
- 统计 API（聚合查询）
- 前端：仪表盘首页 + 统计详情页（Recharts 图表）
- **可测试**：有数据后查看图表和数据

### 阶段 8：导出 & 设置完善
- PDF 导出（reportlab / weasyprint）
- 用户数据可移植性导出（JSON / JSON+图片ZIP）
- 遗忘曲线自定义、AI 配置设置页
- 用户密码修改
- API 频率限制（slowapi）
- 日志系统（loguru）+ 前端错误上报
- Docker Compose 部署方案 + 备份脚本
- **可测试**：导出 PDF 和 JSON、修改遗忘曲线间隔、Docker 一键部署

---

## 9. 关键依赖版本

### 后端 (requirements.txt)
```
fastapi==0.115.*
uvicorn[standard]==0.32.*
sqlalchemy==2.0.*
alembic==1.14.*
pymysql==1.1.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
paddleocr==2.9.*
paddlepaddle==3.0.*
pymupdf==1.25.*
httpx==0.28.*
nh3==0.1.*
loguru==0.7.*
slowapi==0.1.*
cryptography==44.*
weasyprint==63.*
pillow==11.1.*
```

### 前端 (package.json)
```json
{
  "react": "^18.3",
  "react-dom": "^18.3",
  "react-router-dom": "^6.28",
  "antd": "^5.22",
  "@ant-design/icons": "^5.5",
  "@tiptap/react": "^2.10",
  "@tiptap/starter-kit": "^2.10",
  "@tiptap/extension-image": "^2.10",
  "@tiptap/extension-placeholder": "^2.10",
  "axios": "^1.7",
  "recharts": "^2.14",
  "katex": "^0.16",
  "dompurify": "^3.2",
  "dayjs": "^1.11"
}
```
