# V0.3 架构

```text
动态商品池 Product
  ├─ PlatformListing（多平台、多店铺、多来源）
  ├─ Strategy（用户自己定义阈值和价格有效期）
  └─ PriceRecord（市场事实、截图、核验状态、有效期）
          │
          ├─ Price Analytics（范围、分位、波动、异常）
          ├─ Selection Engine（候选排序，不替用户决策）
          └─ Signal Engine（只执行用户策略）
                    │
                    └─ Daily Report / Dashboard
```

## 三个严格分层

1. **市场事实**：抓到什么、是否核验、什么时候失效。
2. **选品候选**：哪些商品值得优先看，允许使用线索和波动特征。
3. **用户信号**：只有新鲜、同币种、已核验到手价可以触发。

这三层不得混用。候选分高不等于买入信号。
