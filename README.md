# StrideOS

[![CI](https://github.com/z17code/StrideOS/actions/workflows/ci.yml/badge.svg)](https://github.com/z17code/StrideOS/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/z17code/StrideOS?display_name=tag)](https://github.com/z17code/StrideOS/releases)

面向大众进阶跑者的智能训练驾驶舱（邀请制 MVP）。

> **文档入口**：人类/运维看 [HANDOFF.md](./HANDOFF.md)；AI Agent 先看 [AGENTS.md](./AGENTS.md)。
>
> **文档维护**：重大行为 / schema / API 变更时，须同步更新 `AGENTS.md` §4 与 `HANDOFF.md`（见两文内「文档维护约定」），不要只改代码。


## 技术栈

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + Radix UI + Lucide
- Drizzle ORM + PostgreSQL（本地开发 / 生产 Neon）
- 自定义认证（scrypt + HttpOnly Cookie）
- Vitest（单元测试 + fast-check 属性测试）
- PWA（`manifest.webmanifest` + service worker）
- Android Capacitor WebView 壳（加载生产站，可选）
- i18n（Cookie `strideos_locale`，基础版 zh-CN / en）

更完整的交接说明见 [HANDOFF.md](./HANDOFF.md)。

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串（本地或 Neon；Neon 需 `?sslmode=require`） |
| `SESSION_SECRET` | ≥32 字符随机串 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `db:seed` 种子管理员 |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | 可选；周报 AI 评语（OpenAI-compatible） |
| `STRENGTH_TEMPLATES_JSON` | 可选；覆盖默认力量模板 |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | 可选；额外允许的 Origin（CSRF 校验） |
| `FORCE_SECURE_COOKIES` | 可选；设为 `1` 强制 Cookie `Secure` |

生产示例：

- `AI_BASE_URL=https://apihub.agnes-ai.com/v1`
- `AI_MODEL=agnes-2.0-flash`
- `AI_API_KEY` **只放 Vercel / 本地 `.env.local`，禁止提交仓库**

### 3. 数据库

```bash
# 推荐：应用正式迁移
npm run db:migrate

# 或开发期直接 push schema（与迁移可能不同步）
npm run db:push

# 创建管理员
npm run db:seed
```

改 `src/db/schema.ts` 后：

```bash
npm run db:generate   # 生成迁移 SQL
npm run db:migrate    # 执行迁移
```

### 4. 启动

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

- 普通用户：`/login` → `/today`
- 管理员：登录后进入 `/admin`（用户/邀请码/限流/审计）

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产构建 |
| `npm run lint` | Next.js lint |
| `npm run typecheck` | TypeScript 检查 |
| `npm test` | 单元测试（单次） |
| `npm run test:watch` | Vitest watch |
| `npm run db:generate` | 生成 Drizzle 迁移 |
| `npm run db:migrate` | 执行迁移 |
| `npm run db:push` | 直接 push schema |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | 种子管理员 |
| `npm run cap:sync` | 同步 Capacitor 配置到 `android/` |
| `npm run cap:open` | 用 Android Studio 打开工程 |
| `npm run cap:copy` | 仅复制 web 资源到 Android |

## Phase 进度

### Phase 1
- [x] 项目骨架与黑白应用壳
- [x] Drizzle schema（全量核心表）
- [x] 邀请码注册 / 登录 / 登出 / 重置令牌
- [x] 管理员：用户启停、邀请码、重置令牌
- [x] 响应式导航（移动端底栏 / 桌面侧栏）

### Phase 2
- [x] 入门问卷（Onboarding）与档案（**可跳过**）
- [x] 比赛目标 CRUD（单活跃目标）
- [x] 确定性 PlanEngine（8–24 周，阶段/递进/减量/间隔/长跑上限）
- [x] 计划版本持久化与生成 API
- [x] 响应式周历 + 课表明细 + 版本历史（重命名 / 激活 / 删除）
- [x] 计划导出：iCal / Markdown / 打印转 PDF
- [x] Vitest 单元测试 + fast-check 属性测试

### Phase 3
- [x] 打卡表单（疲劳 1–5 / 疼痛 0–10）+ 今日训练列表
- [x] 训练记录 CRUD（距离 / 时长 / RPE / 心率 / 疼痛 / 备注 / 幂等 ID）
- [x] 智能调课引擎（5 条规则）+ 确认 / 忽略 / 撤销流程
- [x] 周报 / 月报 / 趋势报告 + AI 评语（8s 超时 + 模板兜底）
- [x] 三页 UI 全部落地（today / activity / insights）
- [x] 引擎边界测试 + AI fallback 测试 + mutationId 幂等测试

### Phase 4
- [x] VDOT 引擎（Daniels 公式 + 等价成绩 + 训练配速区间 + 负分割策略）
- [x] 比赛策略 API（计算 + 保存 + 列表 + 删除）
- [x] 跑鞋管理 CRUD + API（里程自动累加 + 退役）
- [x] 力量训练：默认模板 + **自定义 exercises JSON** + CRUD
- [x] 模板可通过 `STRENGTH_TEMPLATES_JSON` 覆盖
- [x] `/tools` 页落地（成绩预测 / 配速 / BMI、训练配速表、心率区间、分段配速、间歇设计、补给/恢复清单、周负荷（只读）等 / 跑鞋 / 力量 / 比赛策略）
- [x] 成绩预测：VDOT 锚定 + 各距离表现评估与等价成绩（纯前端）
- [x] 配速计算器：里程与用时/配速/圈速互算（纯前端）
- [x] BMI 计算器：中国成人区间 + 标准体重（纯前端）
- [x] Phase 4 测试 + 文档更新

### 平台能力
- [x] 移动端 PWA（manifest + 轻量 service worker）
- [x] Android Capacitor WebView 壳（加载 `stride-os-livid.vercel.app`）
- [x] 界面语言切换（导航 +「我的」页；Cookie `strideos_locale`）
- [x] Client 组件禁止直接 import DB service（力量模板见 `src/lib/strength/templates.ts`）
- [x] 外观主题（跟随系统 / 浅色 / 深色）+ 可切换主题色
- [x] 帮助与反馈（微信号 z17code）
- [x] 管理员：用户备注 + 修改用户名；概览 / 限流 / 审计 / 踢下线
- [x] 登录限流锁定 + 安全响应头
- [x] 用户自助注销 / 管理员永久注销
- [x] 打卡上海时区日期；计划周历边界隐藏翻页
- [x] 入门成绩/目标：时分秒输入框

## 关键 API

### 认证 / 账号

| 方法 | 路径 | 备注 |
|------|------|------|
| POST | `/api/v1/auth/register` | |
| POST | `/api/v1/auth/login` | |
| POST | `/api/v1/auth/logout` | |
| POST | `/api/v1/auth/reset-password` | |
| GET  | `/api/v1/health` | 公共就绪探测（DB `select 1`，无密钥） |
| GET  | `/api/v1/me` | |
| DELETE | `/api/v1/me` | 自助注销；body 确认文案见 HANDOFF |
| POST | `/api/v1/me/locale` | |
| GET/PUT | `/api/v1/me/profile` | |

### Onboarding / 目标 / 计划

| 方法 | 路径 | 备注 |
|------|------|------|
| GET  | `/api/v1/onboarding/status` | |
| POST | `/api/v1/onboarding/complete` | body 含 `skip: true` 可跳过 |
| GET/POST | `/api/v1/goals` | |
| PUT/DELETE | `/api/v1/goals/:id` | |
| GET  | `/api/v1/plans` | |
| GET  | `/api/v1/plans/current` | |
| POST | `/api/v1/plans/generate` | |
| GET/PATCH/DELETE | `/api/v1/plans/:versionId` | PATCH：`label` 等；POST 可激活 |
| GET  | `/api/v1/plans/:versionId/export` | `?format=ics\|md\|pdf` |

### 打卡 / 活动 / 调课 / 报告

| 方法 | 路径 |
|------|------|
| GET/POST | `/api/v1/check-ins` |
| GET/POST | `/api/v1/activities` |
| GET/PUT/DELETE | `/api/v1/activities/:id` |
| GET  | `/api/v1/adjustments` |
| POST | `/api/v1/adjustments/propose` |
| PUT  | `/api/v1/adjustments/:id/confirm` |
| PUT  | `/api/v1/adjustments/:id/reject` |
| POST | `/api/v1/adjustments/:id/revert` |
| GET  | `/api/v1/reports/weekly` |
| GET  | `/api/v1/reports/monthly` |
| GET  | `/api/v1/reports/trends` |

### 工具（Phase 4）

| 方法 | 路径 |
|------|------|
| GET/POST | `/api/v1/shoes` |
| GET/PUT/DELETE | `/api/v1/shoes/:id` |
| GET/POST | `/api/v1/strength` |
| GET/PUT/DELETE | `/api/v1/strength/:id` |
| GET/POST | `/api/v1/strategies` |
| GET/DELETE | `/api/v1/strategies/:id` |

### 管理员

| 方法 | 路径 | 备注 |
|------|------|------|
| GET  | `/api/v1/admin/stats` | 概览 KPI |
| GET  | `/api/v1/admin/users` | 列表；`q` / `status` |
| GET  | `/api/v1/admin/users/:id` | 只读摘要 |
| PUT  | `/api/v1/admin/users/:id` | `isActive` / `username` / `adminNote` |
| DELETE | `/api/v1/admin/users/:id` | 永久注销 |
| DELETE | `/api/v1/admin/users/:id/sessions` | 踢下线 |
| GET/POST | `/api/v1/admin/invite-codes` | |
| DELETE | `/api/v1/admin/invite-codes/:id` | |
| DELETE | `/api/v1/admin/invite-codes` | 清空全部 |
| POST | `/api/v1/admin/reset-token` | 生成重置令牌（含链接） |
| DELETE | `/api/v1/admin/reset-token` | 作废未用令牌 |
| GET/DELETE | `/api/v1/admin/rate-limits` | 限流管理 |
| GET  | `/api/v1/admin/audit-logs` | 操作审计 |

### API 备注

- `POST /api/v1/strategies` body: `{ distanceType, targetTimeSec, label?, save? }`
  - `save` 缺省 / `false` → 纯计算（不写库）
  - `save: true` → 计算并持久化
- `GET /api/v1/shoes?active=1` → 仅未退役跑鞋
- `GET /api/v1/strength?templates=1` → 返回力量模板列表
- `POST /api/v1/onboarding/complete` 传 `{ skip: true }` 跳过入门
- `GET /api/v1/plans/:versionId/export?format=ics|md|pdf`
- 计划版本：`PATCH` 改 label；`POST` 激活；`DELETE` 删除（不可删唯一活跃版时按业务错误返回）

## Android APK（Capacitor WebView）

可选：用 Capacitor 把线上站点包成 Android 安装包（**WebView 壳，不是原生重写 / 不支持离线写入**）。

| 项 | 值 |
|----|-----|
| 包名 | `com.strideos.app` |
| 打开地址 | https://stride-os-livid.vercel.app |
| 配置 | `capacitor.config.ts` |
| 资产文件名 | `strideos-android.apk` |

### 下载渠道

- **网站「我的」页**（唯一用户可见入口）：`/downloads/strideos-android.apk`（源文件 `public/downloads/strideos-android.apk`）
- 用户面不提供 GitHub Releases 外链

安装注意：

- 需允许安装未知来源应用（非 Play 商店分发）
- Debug 签名包仅供内测，正式上架需 release 签名 keystore
- 手机需能访问生产站；登录 / 计划 / 打卡仍走 Vercel + Neon

### 自行打包

```bash
# 依赖已包含 @capacitor/*；首次或配置变更后：
npm run cap:sync
npm run cap:open
```

在 Android Studio 中：`Build > Build Bundle(s) / APK(s) > Build APK(s)`。  
Debug APK 一般在 `android/app/build/outputs/apk/debug/app-debug.apk`。

要求本机安装 **Android Studio + Android SDK**。发新版时：

1. 替换 `public/downloads/strideos-android.apk` 并部署站点

## 部署

- **生产站**：https://stride-os-livid.vercel.app
- **GitHub**：https://github.com/z17code/StrideOS
- **Vercel**：`main` 推送后自动部署
- **CI**：GitHub Actions（`typecheck` + `test`，见 `.github/workflows/ci.yml`）
- 生产环境变量：`DATABASE_URL`、`SESSION_SECRET`、`ADMIN_*`、`AI_*`（可选）
- 改 schema 后需对生产库执行 `npm run db:migrate`（或 `db:push`）；**Vercel 不会自动迁移**（含 `0004_user_admin_note`、`0005_auth_rate_limits`、`0006_admin_ops`）
- Neon 免费版可能休眠，冷启动约 2–5 秒
- License：MIT（见 [LICENSE](./LICENSE)）

## 已知限制 / 后续

- [ ] 跑步路线记录集成（GPX / 第三方）
- [ ] 完整 i18n 覆盖所有页面（目前导航 + 我的）
- [ ] 用户自助修改密码
- PWA 为轻量壳缓存，不做离线写操作
- 计划引擎为确定性算法，无 AI 参与生成

## 测试

```bash
npm test
```



