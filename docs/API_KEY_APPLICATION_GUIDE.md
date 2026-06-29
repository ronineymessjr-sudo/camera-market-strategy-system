# 官方电商 API 密钥申请与本地配置指南

更新时间：2026-06-29

## 重要边界

这些密钥必须由项目使用者自己申请：

- 京东联盟：需要你的京东联盟/开放平台账号、应用、联盟 ID。
- 淘宝联盟：需要你的淘宝开放平台/淘宝联盟账号、应用、推广位。
- 多多进宝：需要你的拼多多开放平台/多多进宝账号、应用、推广位 PID。
- eBay Browse API：需要 eBay Developer 应用的 Client ID 和 Client Secret。
- Amazon Product API：需要 Amazon Associates/PA-API 或 Creators API 对应的 Access Key、Secret Key、Partner Tag。

不要把密钥发给前端，不要写入 Git，不要写进文档正文。只放在 `backend/.env`。

## 申请入口与关键词

### 京东联盟

需要字段：

- `JD_APP_KEY`
- `JD_APP_SECRET`
- `JD_UNION_ID`

建议搜索/入口关键词：

- 京东联盟
- 京东开放平台
- `jd.union.open.goods.query`
- 京粉精选 / 商品查询

本项目默认方法名：

```env
JD_GOODS_QUERY_METHOD=jd.union.open.goods.query
```

### 淘宝联盟

需要字段：

- `TAOBAO_APP_KEY`
- `TAOBAO_APP_SECRET`
- `TAOBAO_ADZONE_ID`

建议搜索/入口关键词：

- 淘宝开放平台
- 淘宝联盟
- `taobao.tbk.dg.material.optional`
- 淘宝客物料搜索
- 推广位 / adzone_id

本项目默认方法名：

```env
TAOBAO_GOODS_SEARCH_METHOD=taobao.tbk.dg.material.optional
```

### 多多进宝

需要字段：

- `PDD_CLIENT_ID`
- `PDD_CLIENT_SECRET`
- `PDD_PID`

建议搜索/入口关键词：

- 拼多多开放平台
- 多多进宝
- `pdd.ddk.goods.search`
- 推广位 PID

本项目默认方法名：

```env
PDD_GOODS_SEARCH_METHOD=pdd.ddk.goods.search
```

### eBay Browse API

需要字段：

- `EBAY_CLIENT_ID`
- `EBAY_CLIENT_SECRET`
- `EBAY_MARKETPLACE_ID`

建议搜索/入口关键词：

- eBay Developer Program
- Browse API
- `buy/browse/v1/item_summary/search`
- Client Credentials OAuth

本项目默认市场：

```env
EBAY_MARKETPLACE_ID=EBAY_US
```

### Amazon Product API

需要字段：

- `AMAZON_ACCESS_KEY`
- `AMAZON_SECRET_KEY`
- `AMAZON_PARTNER_TAG`

建议搜索/入口关键词：

- Amazon Associates
- Amazon Product Advertising API
- Amazon Creators API
- SearchItems
- Partner Tag

本项目默认配置：

```env
AMAZON_PAAPI_HOST=webservices.amazon.com
AMAZON_PAAPI_REGION=us-east-1
AMAZON_PARTNER_TYPE=Associates
```

## 本地配置

1. 复制环境变量模板：

```powershell
Copy-Item backend\.env.example backend\.env
```

2. 把申请到的字段填入 `backend/.env`：

```env
JD_APP_KEY=
JD_APP_SECRET=
JD_UNION_ID=

TAOBAO_APP_KEY=
TAOBAO_APP_SECRET=
TAOBAO_ADZONE_ID=

PDD_CLIENT_ID=
PDD_CLIENT_SECRET=
PDD_PID=

EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_US

AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_PARTNER_TAG=
```

3. 重启后端：

```powershell
rtk powershell -ExecutionPolicy Bypass -File scripts\stop-local.ps1
rtk powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

4. 检查配置状态：

```powershell
rtk backend\.venv\Scripts\python.exe -X utf8 scripts\check-integration-credentials.py
```

5. 跑 v0.4 smoke：

```powershell
rtk backend\.venv\Scripts\python.exe -X utf8 scripts\smoke-v04.py
```

没有密钥时，`/api/integrations/{provider}/sync` 应返回 `409`。填好密钥后，应先用很小的搜索条件联调。

## 首次真实联调建议

先用每个平台 1 个关键词、`page_size=5`：

```http
POST /api/integrations/jd/sync
{
  "keyword": "Sigma 17-40 Sony E",
  "product_id": 1,
  "page_size": 5,
  "ingest": true
}
```

```http
POST /api/integrations/taobao/sync
{
  "keyword": "Sigma 17-40 索尼 E",
  "product_id": 1,
  "page_size": 5,
  "ingest": true
}
```

```http
POST /api/integrations/pdd/sync
{
  "keyword": "DJI Pocket 3",
  "product_id": 6,
  "page_size": 5,
  "ingest": true
}
```

```http
POST /api/integrations/ebay/sync
{
  "keyword": "Sony a6700 camera",
  "product_id": 8,
  "page_size": 5,
  "ingest": true
}
```

```http
POST /api/integrations/amazon/sync
{
  "keyword": "Sony a6700 camera",
  "product_id": 8,
  "page_size": 5,
  "ingest": true
}
```

## 数据安全规则

- API 同步得到的优惠价统一是 `VISIBLE_PRICE`。
- `VISIBLE_PRICE` 只能作为线索，不触发策略。
- 只有人工核验后的 `VERIFIED_CHECKOUT` 才能触发买入信号。
- 如果平台返回单位是“分”，必须确认归一化为“元”后再用于展示。
- 如果平台返回链接是推广短链，也要保留原始 `raw_payload_json` 方便排查。
