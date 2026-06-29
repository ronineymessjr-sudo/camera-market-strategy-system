# 开源电商与推荐系统参考

本项目没有直接搬用完整电商平台，而是提取适合“单用户、价格追踪、用户策略”的架构思想。

## 1. Saleor

参考仓库：`https://github.com/saleor/saleor`

可学习：

- API-first 商品目录。
- 商品属性和 metadata 可扩展。
- 渠道与商品信息分离。
- 通过 Webhook / App 扩展核心系统。

本项目对应：

- `Product` 是内部统一商品。
- `PlatformListing` 是不同平台和店铺的渠道条目。
- 商品池可动态增删，不再写死 7 个商品。

## 2. Medusa

参考仓库：`https://github.com/medusajs/medusa`

可学习：

- 商务能力按模块拆分，而不是写成一个巨型服务。
- 商品、价格、促销、库存和工作流边界清楚。

本项目对应：

- 商品目录、爬取、价格事实、策略、信号、分析和报告分别放在独立 service/router。
- 当前不引入结算、支付和订单模块，因为本项目不自动交易。

## 3. Metarank

参考仓库：`https://github.com/metarank/metarank`

可学习：

- Candidate generation 与 ranking 分离。
- 排名可以使用实时特征和用户反馈。
- 推荐排名不是交易信号。

本项目对应：

- `/api/selection/candidates` 只生成选品候选和关注分。
- `is_buy_signal` 只有在新鲜 `VERIFIED_CHECKOUT` 满足用户阈值时才为真。

## 4. Recommenders

参考仓库：`https://github.com/recommenders-team/recommenders`

可学习：

- 推荐系统的数据准备、评估、基线和生产实践。
- 先建立可解释基线，再引入复杂模型。

本项目对应：

- V0.3 使用可解释规则分数。
- 未来积累点击、收藏、核验、忽略和购买反馈后，再做离线评估。

## 5. RecBole

参考仓库：`https://github.com/RUCAIBox/RecBole`

可学习：

- 大量推荐算法的统一实验接口。
- 适合有足够用户—商品交互数据后做算法对比。

本项目当前不直接引入：

- 当前是单用户，行为样本太少。
- 先积累真实价格和用户反馈，比直接上深度推荐更重要。

## 当前选品分层

```text
候选生成：活跃商品池
    ↓
市场特征：价格时效、核验等级、近窗分位、波动率
    ↓
用户特征：触发线、强买线、优先级、价格有效期
    ↓
候选排序：score + status + reasons
    ↓
策略信号：只认新鲜 VERIFIED_CHECKOUT
```
