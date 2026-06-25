# GameSeeker 开发计划

## 第一阶段：CF Worker 迁移（已完成）
- ~~Python → JS 重写~~
- ~~Worker 入口 + 管理后台~~
- ~~前段迁移 + 清理旧文件~~

## 第二阶段：Telegram Bot 接入

### T1: Bot 核心模块
- `worker/lib/telegram.js` — Telegram API 封装 + Webhook 处理 + 命令路由

### T2: 搜索功能
- `/search` 三层搜索（本地模糊 → Steam中文 → Steam英文）
- 中英文对照显示
- 单条详情 + 多条列表展示

### T3: Bot 命令
- `/start` 欢迎
- `/recommend` 今日推荐
- `/library` 库概况
- `/stats` 统计
- `/subscribe /unsubscribe /list` 降价订阅
- `/run` 管理命令
- 管理员鉴权

### T4: 通知 + 降价检查
- Cron 完成通知管理员
- 降价自动检查 cron（每日 4:00）
- 降价推送通知

### T5: 集成 Worker
- 路由 `/api/bot/webhook` 接入
- `/api/bot/set-webhook` 辅助接口
- Cron 通知挂钩
- `wrangler.toml` 更新 cron

### T5: 集成 Worker（已完成）
- 路由 `/api/bot/webhook` + `/api/bot/set-webhook`
- Cron 通知挂钩
- 降价检查 cron `0 4 * * *`

## 各阶段结束后
- 代码审查 + 修复 bug
- 全部完成后端到端测试
