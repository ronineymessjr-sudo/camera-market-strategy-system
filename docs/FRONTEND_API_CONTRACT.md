# 前端接入合同

## 一次性加载首页

```http
GET /api/frontend/bootstrap?user_name=ronin
```

该接口返回：

- 官方 API 提供商配置状态
- 价格数据状态统计
- 最近爬虫运行
- 最近官方 API 同步运行
- 当前选品候选
- 商品概览

前端首页不需要并发请求十几个接口。

## 详细页面接口

- 商品详情：`GET /api/products/{id}`
- 商品价格：`GET /api/prices/product/{id}`
- 价格分析：`GET /api/analytics/products/{id}`
- 量化指标：`GET /api/quant/products/{id}/indicators`
- 策略回测：`POST /api/quant/backtests`
- 选品列表：`GET /api/selection/candidates`
- 待核验队列：`GET /api/prices/review-queue`
- 官方优惠快照：`GET /api/integrations/offers`
- 日报：`GET /api/reports/daily`

## 前端状态语义

- `VERIFIED_CHECKOUT`：真实到手价，可用于策略。
- `VISIBLE_PRICE`：公开/API 可见价，需要核验。
- `UNVERIFIED`：仅线索。
- `INVALID`：错误信息。
- `STRATEGY_TRIGGERED*`：用户策略被真实、有效的到手价触发。
- `NEAR_TARGET` / `VOLATILE`：排序标签，不是购买信号。

## OpenAPI

FastAPI 自动提供：

- Swagger：`/docs`
- OpenAPI JSON：`/openapi.json`

前端可以用 `openapi-typescript` 自动生成类型，避免手写 DTO 漂移。
