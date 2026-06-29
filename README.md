# Camera Market Strategy System V0.6

摄影器材价格追踪、人工核验、策略触发、日报与公开测试入口系统。

当前测试入口：

- Cloudflare Worker 稳定入口：https://camera-market-test-entry.photomagic.workers.dev
- 本机完整临时系统：https://camera-market-test-r9.loca.lt

> `loca.lt` 是临时隧道，只在本机服务和隧道进程运行时可访问；正式生产建议使用 Cloudflare Zone + Named Tunnel 或持久服务器。

## V0.6 新增

- 完整 Next.js 前端：概览、商品、详情、机会、核验、通知、历史、日报、策略、数据源。
- 前端同源代理：浏览器访问 `/api/*` 和 `/static/*`，Next 转发到 FastAPI。
- Cloudflare Worker 公共入口：`deploy/cloudflare-public/`。
- 海外 API Provider 槽位：Amazon Product API、eBay Browse API。
- 国内 API Provider 槽位：京东联盟、淘宝联盟、多多进宝。
- 动效与视觉升级：深海蓝仪表盘、卡片入场、状态脉冲、导航光效、移动端表格提示。

## V0.6 快速启动

后端：

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

前端生产代理：

```powershell
cd frontend
$env:PORT="3003"
$env:INTERNAL_API_BASE_URL="http://127.0.0.1:8000"
npm run build
npm run start
```

Cloudflare Worker 入口部署：

```powershell
cd deploy\cloudflare-public
wrangler deploy
```

## 当前验证

- Backend tests: `19 passed`
- Frontend build: passed
- Local audit: 20 products, 23 listings, 79 price records, 20 strategies, 23 signals, 4 reports

详细部署说明见 `docs/DEPLOYMENT_V06.md`。

---

# Camera Market Strategy System V0.4

本版本在 V0.3 动态商品池、有效期信号和选品引擎基础上，增加官方电商开放平台适配层、量化指标、策略回测和前端聚合接口。

> 注意：代码已经包含京东联盟、淘宝联盟、多多进宝适配器，但真实联网必须由用户申请平台资质并在本地 `.env` 填写密钥。没有密钥时系统不会伪造数据。

## V0.4 快速入口

- 官方 API：`docs/API_INTEGRATIONS.md`
- 量化引擎：`docs/QUANT_ENGINE.md`
- 前端合同：`docs/FRONTEND_API_CONTRACT.md`
- Codex 合并：`docs/CODEX_HANDOFF_V04.md`
- 变更说明：`CHANGELOG_V0.4.md`

# Camera Market Strategy System V0.3

摄影数码商品池、价格线索、人工核验、波动分析、用户策略和选品候选系统。

> **市场事实 → 用户策略 → 信号触发**

系统不自动下单，也不替用户决定购买。网页可见价只进入人工核验和候选排序；只有**新鲜且已核验的 `VERIFIED_CHECKOUT` 到手价**才能触发 `BUY_TRIGGERED` 或 `STRONG_BUY`。

## V0.3 解决的问题

- 商品池不再固定：支持运行时新增、修改、归档、恢复和来源增删。
- 支持一句话命令：例如“添加 Sigma 17-40 F1.8 触发价4500 强买价4300 https://…”或“移除 DJI Pocket 3”。
- 已核验价格增加有效期；旧的 4299 元不会永久让日报每天显示“可以买”。
- 信号增加 `STALE`、`CURRENCY_MISMATCH`、`WATCH_ONLY` 等状态。
- 自动计算 7/30/90 日价格范围、首尾变化、分位、稳健波动率和异常分数。
- 新增规则型选品候选：只做关注排序，不把推荐排序伪装成用户买入信号。
- 日报拆为市场事实、用户策略、信号、选品候选、价格波动和数据缺口。
- 初始化种子不再在每次真实流程中强行补回已删除商品。

## 关键 API

```text
POST   /api/watchlist/commands
GET    /api/products?include_archived=true
PATCH  /api/products/{id}
DELETE /api/products/{id}
POST   /api/products/{id}/restore
PATCH  /api/products/{id}/listings/{listing_id}
DELETE /api/products/{id}/listings/{listing_id}
GET    /api/analytics/products/{id}?window_days=30
GET    /api/analytics/market?window_days=30
GET    /api/selection/candidates
```

## Windows 本地快速启动

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-local.ps1
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

首次 `setup-local.ps1` 会使用 `--bootstrap` 建立演示商品。之后 `run-real-flow.ps1` 不再重复执行固定商品种子，因此用户归档或删除观察项后不会被自动补回。

访问：

- 前端：http://127.0.0.1:3000
- 后端文档：http://127.0.0.1:8000/docs
- 商品池与人工核验：http://127.0.0.1:3000/products
- 用户策略：http://127.0.0.1:3000/strategies
- 日报：http://127.0.0.1:3000/reports

运行真实流程：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-real-flow.ps1
```

## 从 V0.2 / 现有项目升级

1. 备份 `backend/camera_market.db`。
2. 合并程序文件，保留原数据库、截图和图表目录。
3. 执行：

```powershell
backend\.venv\Scripts\python.exe -X utf8 backend\scripts\migrate_local.py
backend\.venv\Scripts\python.exe -X utf8 -m pytest backend\tests
npm --prefix frontend run build
```

增量升级只增加字段和新表，不清空旧数据。旧的 `VERIFIED_CHECKOUT` 会保留为历史事实，但若超出策略的 `max_price_age_hours`，信号变为 `STALE`。

## 测试

```powershell
cd backend
.\.venv\Scripts\python.exe -m compileall app scripts
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
npm install
npm run build
```

## 安全与真实性边界

- 不绕过登录或验证码。
- 不使用代理池或复杂指纹伪装。
- 不自动抢券、下单或支付。
- 不把外币、MSRP、规格数字或普通网页可见价当作结算价。
- 不允许 `VISIBLE_PRICE` / `UNVERIFIED` / `STALE` 触发买入信号。
