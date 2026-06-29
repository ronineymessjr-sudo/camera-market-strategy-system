# V0.4 变更

## 官方数据源适配

- 新增京东联盟 Provider Adapter。
- 新增淘宝联盟 Provider Adapter。
- 新增多多进宝 Provider Adapter。
- 新增平台签名、HTTP 调用、响应归一化。
- 新增 `external_offers` 和 `integration_runs`。
- API 优惠线索可入库，但固定为 `VISIBLE_PRICE`。
- 无密钥时明确返回未配置，不生成模拟数据。

## 量化研究能力

- SMA / EMA。
- RSI(14)。
- Bollinger Bands。
- Z-Score 与价格分位。
- 最大回撤、下行波动、风险等级。
- 市场状态识别。
- 用户目标价策略历史回测。
- 回测结果持久化。

## 前端数据合同

- 新增 `/api/frontend/bootstrap`。
- 新增 TypeScript API client 示例。
- 新增官方数据源、量化、回测完整接口文档。

## 新增 API

```text
GET  /api/integrations/providers
POST /api/integrations/{provider}/sync
GET  /api/integrations/offers
GET  /api/integrations/runs
GET  /api/quant/products/{product_id}/indicators
POST /api/quant/backtests
GET  /api/frontend/bootstrap
```

## 测试

- 新增签名稳定性测试。
- 新增京东/淘宝/拼多多响应归一化测试。
- 新增量化指标和策略回测测试。
