# V0.9 Motion System

## 技术选择

- 公开入口：轻量 Canvas 粒子涡旋，不使用 Remotion Player。
- 主应用：Motion for React 负责页面进入、卡片 reveal、hover/tap。
- 首页环境效果：Three.js Points，低功耗模式，并在减少动态效果时关闭。
- 数字动效：自定义 requestAnimationFrame 计数，不依赖 Motion+。

## 为什么没有把 Remotion 放进首屏

Remotion 更适合用 React 生成 MP4、模板化视频和可控播放器。这个入口需要实时响应窗口尺寸、设备性能和减少动态效果设置，因此使用 Canvas/Three.js 更合适。以后可以用 Remotion 输出路演视频，不放进主产品运行时。

## 覆盖文件

- frontend/package.json
- frontend/app/layout.tsx
- frontend/app/page.tsx
- frontend/app/globals.css
- frontend/components/app-shell.tsx
- frontend/components/dashboard-ui.tsx
- frontend/components/motion-system.tsx
- frontend/components/ambient-field.tsx
- frontend/components/animated-number.tsx
- deploy/cloudflare-public/worker.js

## 合并与验证

```bash
npm --prefix frontend install
npm --prefix frontend run build

cd deploy/cloudflare-public
npx wrangler deploy
```

## 核心功能要求

- 不删除任何原有页面、API、数据库或后端逻辑。
- VERIFIED_CHECKOUT 才可触发策略。
- VISIBLE_PRICE 与 UNVERIFIED 只作为证据。
- 所有动效必须尊重 prefers-reduced-motion。
- 移动端关闭或降低 Three.js 粒子数量。
