Always respond in Chinese. All communication must be in Chinese unless the user explicitly asks otherwise.

## 版本号管理

每次提交推送前，检查 `public/index.html` 中的 `APP_VERSION` 常量，将其递增后推送。版本号格式为 `v<major>.<minor>.<patch>`，遵循 semver 语义。

## 项目架构

Cloudflare Workers 原生部署：
- `worker/index.js` — Worker 入口（fetch + cron）
- `worker/lib/` — 核心库（steam.js / llm.js / deepsteam.js）
- `worker/scripts/` — 数据管线脚本
- `public/` — 静态前端文件
