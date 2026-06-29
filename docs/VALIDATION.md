# V0.3 验证结果

- Python compileall：通过。
- Pytest：12 项通过。
- 覆盖：价格提取、人工核验、信号引擎、过期价格、报告、波动分析、动态商品池、选品候选。
- Next.js production build：通过。
- SQLite 采用增量字段升级，不删除原数据。

## 关键回归条件

- 旧的低价超过策略时效后必须是 `STALE`。
- 归档商品不参与爬取、日报和候选排序。
- `VISIBLE_PRICE` 只能进入人工核验和候选排序。
- 选品候选的高分不得直接转为 `BUY_TRIGGERED`。
