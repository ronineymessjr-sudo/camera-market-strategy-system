# Codex 合并与验收说明（V0.3）

本包基于 V0.2 增加动态商品池、价格时效、波动分析和选品候选。Codex 的任务是把改动合并到用户 Windows 项目，不要重新设计整个项目。

## 重点检查

1. 保留用户现有 `backend/camera_market.db`、截图和图表。
2. 运行 `backend/scripts/migrate_local.py` 增加字段和 `watchlist_command_logs` 表。
3. 确认旧的 4299 元记录仍在，但超过时效后信号为 `STALE`，不是永久 `STRONG_BUY`。
4. 确认归档商品不会被 `run-real-flow.ps1` 或种子脚本重新补回。
5. 确认 `/api/watchlist/commands` 能新增、归档、恢复商品。
6. 确认 `/api/analytics/products/{id}` 和 `/api/selection/candidates` 可用。
7. 确认前端商品页可一句话增删、归档/恢复并查看波动。

## 执行

```powershell
Copy-Item backend\camera_market.db backend\camera_market.db.bak-v03
backend\.venv\Scripts\python.exe -X utf8 backend\scripts\migrate_local.py
backend\.venv\Scripts\python.exe -X utf8 -m compileall backend\app backend\scripts
backend\.venv\Scripts\python.exe -X utf8 -m pytest backend\tests
npm --prefix frontend install
npm --prefix frontend run build
powershell -ExecutionPolicy Bypass -File scripts\run-real-flow.ps1
```

## 不得改变

- 不清空数据库。
- 不把 `VISIBLE_PRICE` 自动升级为 `VERIFIED_CHECKOUT`。
- 不让过期价格、外币或网页线索触发买入信号。
- 不自动登录、绕验证码、抢券、下单或支付。
