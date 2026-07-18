# 用户自带凭据（BYOK）与平台连接器指南

更新时间：2026-06-29

## 重要边界

系统不使用一套公共平台账号，也不要求站点维护者替所有人申请密钥。每位使用者使用自己的开发者或联盟账号申请并连接：

- 京东联盟：需要你的京东联盟/开放平台账号、应用、联盟 ID。
- 淘宝联盟：需要你的淘宝开放平台/淘宝联盟账号、应用、推广位。
- 多多进宝：需要你的拼多多开放平台/多多进宝账号、应用、推广位 PID。
- eBay Browse API：需要 eBay Developer 应用的 Client ID 和 Client Secret。
- Amazon Creators API：需要 Amazon Associates 对应的 Credential ID、Credential Secret、Partner Tag。

不要把密钥发给公开网站或反馈表单，不要写入 Git，不要写进文档正文。只放在使用者自己的 `backend/.env` 或私有生产环境变量中。

## 统一连接器入口

- 公开目录：`GET https://camera-market-intelligence.photomagic.workers.dev/api/connectors`
- 私有后端目录：`GET /api/integrations/catalog`
- 私有配置页面：`/connectors`

这些入口只返回平台名称、所需环境变量名和是否已配置，不接受也不返回任何密钥值。统一流程是：使用者自己申请 → 写入自己的私有后端环境 → 重启 → 在目录中确认状态 → 运行小规模同步。

如需增加新的平台适配器，实现 `backend/app/integrations/base.py` 中的 `MarketplaceProvider`，在 `backend/app/integrations/registry.py` 注册适配器及所需变量名，并为归一化价格和连接器目录添加测试。平台 API 返回的价格仍必须标记为 `VISIBLE_PRICE`。

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

### Amazon Creators API

需要字段：

- `AMAZON_CREDENTIAL_ID`
- `AMAZON_CREDENTIAL_SECRET`
- `AMAZON_CREDENTIAL_VERSION`
- `AMAZON_PARTNER_TAG`

申请入口与限制：

- 进入 Amazon Associates Central 的 Creators API 页面创建应用和凭据。
- 账号必须先通过 Amazon Associates 审核。
- 通过 Creators API 使用商品搜索能力还要求近 30 天至少 10 笔合格销售。
- 旧 PA-API 已于 2026-05-15 停用，本项目不再接受旧 Access Key/Secret Key。

本项目默认配置：

```env
AMAZON_CREATORS_API_URL=https://creatorsapi.amazon
AMAZON_CREDENTIAL_VERSION=3.1
AMAZON_MARKETPLACE=www.amazon.com
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

AMAZON_CREDENTIAL_ID=
AMAZON_CREDENTIAL_SECRET=
AMAZON_CREDENTIAL_VERSION=3.1
AMAZON_MARKETPLACE=www.amazon.com
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
