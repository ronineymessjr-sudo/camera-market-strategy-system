# 价格追踪系统 V0.3 交接文档

## 核心原则

```text
市场事实 -> 用户策略 -> 信号触发 -> 日报
```

- 商品池动态维护，不固定为 7 个商品。
- 候选排序和购买信号分离。
- 只有新鲜、同币种、已核验到手价可触发用户策略。
- 旧价格保留为历史事实，但超过有效期后为 `STALE`。

## 本次新增

### 动态商品池

- 商品新增、编辑、软归档、恢复。
- 来源编辑、停用。
- `/api/watchlist/commands` 支持中文一句话命令。
- 归档商品历史数据保留，但不再爬取、不进入日报和候选。

### 价格时效

- `PriceRecord.valid_until`
- `Strategy.max_price_age_hours`
- `Signal.reason_code / is_current`
- 服务启动时重新计算当前信号，清除旧 `STRONG_BUY` 的当前状态。

### 波动分析

- 近窗最低、最高、中位数、均值。
- 稳健波动率（MAD / median）。
- 首尾变化率、当前分位、异常分数、趋势。
- 样本不足时返回 `INSUFFICIENT_DATA`。

### 选品候选

- Candidate generation：活跃商品池。
- Ranking：优先级、策略距离、价格时效、核验质量、近窗位置和波动。
- 高候选分不等于买入信号。

## 验收结果

- Python compileall 通过。
- Pytest 12 项通过。
- Next.js production build 通过。
- V0.2 SQLite 增量升级模拟通过。
- 旧 4299 元 `STRONG_BUY` 经时效重算后变为 `STALE`。
