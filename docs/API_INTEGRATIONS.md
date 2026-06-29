# 官方电商 API 接入说明（V0.4）

本版本新增京东联盟、淘宝联盟、多多进宝的**可配置适配器**。代码、签名、归一化、入库、同步日志和前端接口都已提供；实际联网调用仍需要用户自行申请各平台开放平台资质并填写密钥。

## 安全原则

- 密钥只放在 `backend/.env`，绝不写入数据库、日志或前端。
- 官方 API 返回的推广价/券后线索统一写为 `VISIBLE_PRICE`。
- 官方 API 数据仍不等于当前账号结算页；不得自动升级为 `VERIFIED_CHECKOUT`。
- 只有人工核验后的最终到手价可以触发购买策略。

## 环境变量

见 `backend/.env.example`：

- 京东：`JD_APP_KEY`、`JD_APP_SECRET`、`JD_UNION_ID`
- 淘宝：`TAOBAO_APP_KEY`、`TAOBAO_APP_SECRET`、`TAOBAO_ADZONE_ID`
- 拼多多：`PDD_CLIENT_ID`、`PDD_CLIENT_SECRET`、`PDD_PID`

API 网关和方法名也全部可配置，避免平台版本变更后需要修改业务代码。

## API

### 查看接入状态

```http
GET /api/integrations/providers
```

不会返回任何密钥，只返回 `configured=true/false`。

### 搜索并同步单个平台

```http
POST /api/integrations/{provider}/sync
Content-Type: application/json

{
  "keyword": "Sigma 17-40 F1.8 Sony E",
  "product_id": 1,
  "page": 1,
  "page_size": 20,
  "min_price": 3000,
  "max_price": 6500,
  "ingest": true
}
```

`provider` 支持：`jd`、`taobao`、`pdd`。

当 `ingest=true` 且传入 `product_id` 时，归一化价格会写入 `price_records`，状态固定为 `VISIBLE_PRICE`，等待人工核验。

### 查询官方 API 优惠快照

```http
GET /api/integrations/offers?provider=jd&product_id=1
```

### 查询同步运行记录

```http
GET /api/integrations/runs
```

## 数据流

```text
官方开放平台
  -> Provider Adapter
  -> ExternalOffer（原始优惠快照）
  -> PriceRecord(VISIBLE_PRICE)
  -> 人工核验
  -> VERIFIED_CHECKOUT
  -> 用户策略
  -> Signal
```

## 平台变化处理

所有网关 URL、API 方法名均是环境变量。若平台升级接口：

1. 先修改 `.env` 中方法名/网关；
2. 若返回结构变化，只修改对应 provider 的 `_extract_items` / `_normalize`；
3. 业务层、数据库和前端接口不变。
