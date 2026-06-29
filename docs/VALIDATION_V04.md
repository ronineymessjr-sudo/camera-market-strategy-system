# V0.4 验证结果

执行日期：2026-06-29

## 已通过

- Python `compileall`：通过。
- 后端 Pytest：17 项全部通过。
- FastAPI OpenAPI 生成：通过，包含 43 个路径。
- 新接口存在：
  - `/api/integrations/providers`
  - `/api/integrations/{provider}/sync`
  - `/api/integrations/offers`
  - `/api/quant/products/{product_id}/indicators`
  - `/api/quant/backtests`
  - `/api/frontend/bootstrap`
- Next.js 生产构建：编译、类型检查、静态页面生成均通过。

## 无法在交付环境完成的验证

京东联盟、淘宝联盟、多多进宝的真实联网请求未执行，因为开放平台密钥、联盟位/PID 属于用户账号凭据，交付环境没有这些凭据。代码在无凭据时会返回 `configured=false` 和明确的 409，不会用模拟数据冒充真实结果。

真实联调应在 Codex 合并后使用用户本地 `.env` 完成，并检查平台返回字段和金额单位。
