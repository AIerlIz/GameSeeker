# GameSeeker Cloudflare Workers 迁移开发计划

## 阶段一：项目骨架
- 创建 `package.json`（wrangler devDep）
- 创建 `wrangler.toml`（KV绑定 + cron + assets）
- 创建目录：`public/`, `worker/lib/`, `worker/scripts/`

## 阶段二：Python → JS 重写
- `worker/lib/steam.js` — Steam API 封装（重试/退避/并发）
- `worker/lib/llm.js` — LLM 客户端（OpenAI/DeepSeek/Qwen）
- `worker/lib/deepsteam.js` — DeepSteam 算法（多兴趣路由/RRF/系列过滤）
- `worker/scripts/fetch-steam.js` — 增量拉取 Steam 详情
- `worker/scripts/fetch-library.js` — 全量游戏库同步
- `worker/scripts/fill-details.js` — 补全缺失详情

## 阶段三：Worker 入口 + 管理后台
- `worker/index.js`
  - fetch handler: 7 条路由规则
  - scheduled handler: 2 个 cron 任务
  - admin 管理面板（内联 HTML/CSS/JS）
  - 认证中间件（密码 + Cookie session）

## 阶段四：前端文件迁移
- `index.html` → `public/index.html`
- `assets/logo.svg` → `public/assets/logo.svg`
- 修改 `index.html`：移除 `__PROXY_BASE__`，改为 `/api/proxy/`
- footer 添加「管理」链接

## 阶段五：清理 + 文档
- 删除 `.github/workflows/`, `.github/actions/`, `.github/scripts/`
- 删除 `requirements.txt`
- 更新 `.gitignore`, `README.md`, `AGENTS.md`

## 各阶段结束后
- 代码审查 + 修复 bug
- 全部完成后端到端测试
