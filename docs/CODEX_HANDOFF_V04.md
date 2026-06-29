# Codex 合并与测试任务

## 目标

将 V0.4 合并到用户现有 V0.3 项目，保持 SQLite 数据不丢失，并验证官方 API 适配层、量化指标、策略回测和前端聚合接口。

## 合并要求

1. 先备份 `backend/camera_market.db`。
2. 不覆盖用户 `.env`。
3. 将 `.env.example` 新字段手工合并。
4. 运行增量建表，保留全部旧数据。
5. 不将任何密钥提交 Git。

## 验证命令

```powershell
backend\.venv\Scripts\python.exe -X utf8 backend\scripts\migrate_local.py
backend\.venv\Scripts\python.exe -X utf8 -m compileall backend\app backend\scripts
backend\.venv\Scripts\python.exe -X utf8 -m pytest backend\tests
npm --prefix frontend install
npm --prefix frontend run build
powershell -ExecutionPolicy Bypass -File scripts\run-real-flow.ps1
```

## API 验收

```text
GET  /api/integrations/providers
POST /api/integrations/jd/sync
POST /api/integrations/taobao/sync
POST /api/integrations/pdd/sync
GET  /api/integrations/offers
GET  /api/quant/products/1/indicators
POST /api/quant/backtests
GET  /api/frontend/bootstrap
```

没有平台密钥时，provider 状态应为 `configured=false`，同步接口应返回明确的 409，而不是伪造数据。

## 真实平台联调

用户申请平台资质并提供本地 `.env` 后：

1. 每个平台先用 1 个关键词、page_size=5 测试；
2. 检查原始响应和归一化结果；
3. 确认货币单位（尤其“分”与“元”）；
4. 确认 API 优惠仍写为 `VISIBLE_PRICE`；
5. 在前端人工核验后才允许触发策略。
