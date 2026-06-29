# 单用户本地使用手册（V0.3）

## 首次安装

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-local.ps1
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

## 日常流程

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-real-flow.ps1
```

流程会：

1. 增量升级数据库。
2. 爬取所有活跃商品来源。
3. 生成日报。
4. 执行审计。

它不会再次补回固定演示商品。

## 一句话管理商品池

在商品页输入：

```text
添加 Sigma 17-40 F1.8 触发价4500 强买价4300 https://example.com/item
移除 DJI Pocket 3
恢复 DJI Pocket 3
暂停 iPad Air
```

也可以直接调用：

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/watchlist/commands `
  -ContentType application/json `
  -Body '{"command":"添加 Sony 85 F1.8 触发价2200 https://example.com"}'
```

## 核验价格

网页线索默认不能触发策略。在商品页打开线索，填写：

- 最终到手价。
- 币种和地区。
- 优惠构成。
- 价格有效时长。
- 核验备注。

超过有效时长后，信号自动变为 `STALE`。

## 看波动与选品

- 商品页：查看每个商品 30 日样本、稳健波动率和趋势。
- 首页：查看选品候选排序。
- API：`/api/analytics/market`、`/api/selection/candidates`。

候选排序只是告诉你先看什么，不会替你改变用户策略。
