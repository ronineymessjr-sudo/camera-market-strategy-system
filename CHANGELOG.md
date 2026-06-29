# Changelog

## V0.3.0

### Dynamic watchlist
- Product 新增 `is_active`、`archived_at`、`tags`。
- 增加商品修改、软归档、恢复、来源修改和来源停用 API。
- 增加 `/api/watchlist/commands` 一句话增删商品、来源和价格策略。
- 增加 `watchlist_command_logs` 审计表。
- 爬虫只处理活跃商品与活跃来源。
- `run-real-flow.ps1` 不再每次补回固定演示商品。

### Strategy correctness
- PriceRecord 新增 `valid_until`。
- Strategy 新增 `max_price_age_hours` 与 `near_target_pct`。
- Signal 新增 `reason_code` 与 `is_current`。
- 过期已核验价格返回 `STALE`，不再持续触发日报。
- 币种不匹配返回 `CURRENCY_MISMATCH`。

### Price analytics and selection
- 新增近窗价格范围、稳健波动率、变化率、分位和异常分数。
- 新增 `/api/analytics/*`。
- 新增规则型选品候选 `/api/selection/candidates`。
- 候选排序与用户买入信号严格分离。

### Report and UI
- 日报增加价格时效、选品候选和 30 日波动表。
- 首页增加候选排序和当前有效核验价。
- 商品页增加一句话命令、归档/恢复、波动状态和价格有效期。
- 策略页可配置价格最大有效期和接近目标阈值。

### Validation
- 新增价格时效、波动分析、动态商品池和选品候选测试。
