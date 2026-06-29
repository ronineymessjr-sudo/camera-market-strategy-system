# 从现有项目应用 V0.3

1. 备份数据库：

```powershell
Copy-Item backend\camera_market.db backend\camera_market.db.bak-v03
```

2. 合并本包代码，保留现有数据库和静态文件目录。

3. 增量升级：

```powershell
backend\.venv\Scripts\python.exe -X utf8 backend\scripts\migrate_local.py
```

新增字段包括：

- `products.tags / is_active / archived_at`
- `price_records.valid_until`
- `strategies.max_price_age_hours / near_target_pct`
- `signals.reason_code / is_current`
- `watchlist_command_logs`

4. 验证：

```powershell
backend\.venv\Scripts\python.exe -X utf8 -m pytest backend\tests
npm --prefix frontend run build
```

5. 运行真实流程。V0.3 的 `run-real-flow.ps1` 不再执行固定商品种子。
