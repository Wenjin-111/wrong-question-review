# 错题收集与重做系统

基于 FastAPI + React 的错题管理平台，支持 AI 辅助录入、间隔重复复习和 AI 答疑。

## 功能

- **错题管理** — 支持选择题、填空题、主观题，富文本编辑，标签分类
- **AI 录入** — 拍照/截图 OCR 识别 + AI 自动解析题目、答案和解析
- **间隔重复** — 基于遗忘曲线的智能复习计划，可自定义间隔
- **AI 答疑** — 多轮对话，支持绑定/解绑题目上下文，LaTeX 公式渲染
- **数据统计** — 正确率趋势、学科分布、复习记录
- **数据导出** — JSON / PDF 导出
- **算 24 小游戏** — 内置练习/限时挑战两种模式，按解题难度分三档出题

## 界面预览

| 首页 | 错题库 |
|------|--------|
| ![首页](screenshots/%E9%A6%96%E9%A1%B5.png) | ![错题库](screenshots/%E9%94%99%E9%A2%98%E5%BA%93.png) |

| AI 答疑 | 数据统计 |
|---------|----------|
| ![AI 答疑](screenshots/AI%20%E7%AD%94%E7%96%91.png) | ![数据统计](screenshots/%E6%95%B0%E6%8D%AE%E7%BB%9F%E8%AE%A1.png) |

| 24 小游戏 |
|-----------|
| ![24 小游戏](screenshots/24%20%E5%B0%8F%E6%B8%B8%E6%88%8F.png) |

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.12+, FastAPI, SQLAlchemy, Alembic, MySQL |
| 前端 | React 19, TypeScript, Vite, Ant Design 5, Tiptap, Recharts, KaTeX |
| AI | OpenAI 兼容 API, HunyuanOCR（本地 GPU）, MinerU 在线解析, PyMuPDF |
| 安全 | bcrypt, JWT (token 版本轮换), Fernet 加密 |

## 快速开始

### 环境要求

- Python 3.12+
- Node.js 20+
- MySQL 8.0+

### 后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
pip install -r requirements-ocr.txt   # OCR 功能（可选）

# 创建 .env 文件
echo DATABASE_URL=mysql+pymysql://root:password@localhost:3306/wrong_questions > .env
echo JWT_SECRET=your-random-secret >> .env
echo ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())") >> .env

# 在 MySQL 中创建数据库
# CREATE DATABASE wrong_questions CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### AI 功能配置

进入「设置 → AI 配置」，填入 OpenAI 兼容 API 地址、Key 和模型名称。

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── main.py              # 应用入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── dependencies.py      # 认证依赖注入
│   │   ├── models/              # 数据模型 (13 张表)
│   │   ├── schemas/             # Pydantic 请求/响应
│   │   ├── routers/             # API 路由 (11 个模块)
│   │   ├── services/            # 业务逻辑
│   │   └── utils/               # 安全工具
│   ├── migrations/              # Alembic 迁移
│   └── uploads/                 # 用户文件
├── frontend/
│   └── src/
│       ├── api/                 # API 客户端
│       ├── components/          # 共享组件
│       ├── pages/               # 页面组件
│       ├── store/               # 状态管理
│       └── types/               # TypeScript 类型
├── REQUIREMENTS.md              # 需求文档
├── TECHNICAL_DESIGN.md          # 技术设计文档
└── CLAUDE.md                    # Claude Code 配置
```

## API 概览

| 前缀 | 模块 |
|------|------|
| `/api/auth` | 注册、登录、Token 刷新 |
| `/api/questions` | 错题 CRUD、图片上传 |
| `/api/review` | 复习会话、提交答案 |
| `/api/ocr` | OCR 识别、PDF 提取、AI 解析 |
| `/api/chat` | AI 对话会话和消息 |
| `/api/stats` | 统计：概览、趋势、学科分布 |
| `/api/settings` | 用户设置、AI 配置、头像 |
| `/api/export` | 数据导出 (JSON/PDF) |
| `/api/subjects` | 学科和题型管理 |
| `/api/tags` | 标签管理 |

## License

MIT
