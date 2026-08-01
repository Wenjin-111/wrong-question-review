# 端到端测试

项目内测试统一放在本目录，不要写到系统临时目录（C:/tmp 等）。

## 运行方式

前后端 dev server 已启动时（backend:8000 / frontend:5173），直接运行：

```bash
python tests/<脚本名>.py
```

脚本使用 Python + Playwright（`sync_playwright`，chromium headless），核心模式：

1. 用 `urllib.request` 调后端 API 准备数据（注册临时用户、建题）
2. Playwright 走真实 UI 流程
3. 断言用 `check(name, cond, detail)` 收集结果，结尾输出 ALL PASS / FAILURES

## 约定

- 测试用户命名带前缀（如 `shf_`、`bt_`、`edit_`），测试结束清理：直接删 `user` 表记录（级联删关联数据）
- 临时截图/产物放本目录，测完删除
- 测试用户前缀：`shf_`（选项随机化）、`bt_`（批量题型）、`edit_`（编辑回填）、`disp_`（展示一致性）
