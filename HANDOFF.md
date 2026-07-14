# StrideOS — 交接文档

> 本文档面向后续接手开发的工程师。所有信息基于 **2026-07-14** 项目状态。

---

## 1. 项目概况

StrideOS 是面向大众进阶跑者的智能训练驾驶舱（邀请制 MVP）。

- **框架**：Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **UI**：Radix UI + Lucide 图标 + 手写少量组件（无 shadcn）
- **数据库**：Drizzle ORM + PostgreSQL（开发用本地，生产用 Neon）
- **认证**：自研 scrypt + HttpOnly Cookie（无第三方 Auth）
- **测试**：Vitest（单元测试 + fast-check 属性测试）
- **部署**：Vercel（已上线，GitHub `main` 自动部署）
- **PWA**：`public/manifest.webmanifest` + `public/sw.js`（生产环境注册）
- **i18n**：Cookie 语言偏好（`zh-CN` / `en`），导航与「我的」页已接入

对外简版说明见 [README.md](./README.md)。

---

## 2. 已完成功能

### Phase 1 — 基础骨架
- 邀请码注册 / 登录 / 登出 / 密码重置
- 管理员后台（用户启停、邀请码、重置令牌）
- 响应式导航（移动端底栏 / 桌面侧栏）
- Drizzle schema：users / sessions / invite_codes / password_reset_tokens

### Phase 2 — 训练计划
- 入门问卷（Onboarding）+ 跑者档案
- **可跳过 onboarding**（`runner_profiles.onboarding_skipped_at`；API：`POST /onboarding/complete` + `{ skip: true }`）
- 比赛目标 CRUD（单活跃目标约束）
- 确定性 PlanEngine（8–24 周，阶段分配 / 递进 / 减量 / 长跑上限）
- 计划版本持久化与生成 API
- 响应式周历 + 课表明细 + **版本历史（重命名 / 激活 / 删除）**
- **计划导出**：iCal（`.ics`）/ Markdown / 打印转 PDF

### Phase 3 — 训练追踪
- 每日打卡（疲劳 1–5 / 疼痛 0–10）
- 训练记录 CRUD（distance / duration / RPE / HR / pain / notes / mutationId 幂等）
- 智能调课引擎（5 条规则）+ 确认 / 忽略 / 撤销
- 周报 / 月报 / 趋势报告 + AI 评语（8s 超时 + 模板兜底）
- 三页 UI：/today / /activity / /insights

### Phase 4 — 工具与策略
- **VDOT 引擎**：Daniels-Gilbert 公式
- **跑鞋管理**：CRUD + 里程自动累加 + 退役
- **力量训练**：默认 5 模板 + **自定义训练（exercises JSON）** + CRUD
- 模板可通过环境变量 `STRENGTH_TEMPLATES_JSON` 覆盖
- **比赛策略 API**：计算 / 计算并保存
- **/tools**：hub / shoes / strength / race

### 平台能力（2026-07-14 增补）
- 移动端 PWA（manifest + service worker 基础缓存）
- 界面语言切换（中/英，Cookie `strideos_locale`）
- Client 组件禁止直接 import DB service（力量模板已拆到 `templates.ts`）

---

## 3. 当前线上环境

### Vercel 部署
- **仓库**：https://github.com/z17code/StrideOS
- **主分支**：`main`，推送到 main 后 Vercel 自动重新部署
- **务必在 Vercel 配置的环境变量**：
  - `DATABASE_URL`：Neon 云数据库连接串（含 `?sslmode=require`）
  - `SESSION_SECRET`：会话签名密钥
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD`：种子管理员
  - **`AI_BASE_URL`**：`https://apihub.agnes-ai.com/v1`
  - **`AI_API_KEY`**：Agnes AI Key（**只放 Vercel/本地 .env.local，禁止提交仓库**）
  - **`AI_MODEL`**：建议 `agnes-2.0-flash`（或该网关支持的模型名）
  - （可选）`STRENGTH_TEMPLATES_JSON`：覆盖默认力量模板

### 云端数据库（Neon）
- **连接串**：见 Vercel 环境变量 `DATABASE_URL`
- **项目名**：`neondb`
- **Schema 同步方式**：
  - **优先**：`npm run db:migrate`（执行 `drizzle/` 下正式迁移）
  - 应急：`npm run db:push`（直接对齐 `schema.ts`，不写迁移历史）
  - **Vercel 构建不会自动迁移**
- **管理员账号**：`db:seed` 创建
- **注意**：Neon 免费版自动休眠，首次访问可能 2–5 秒

### 本地开发数据库
- PostgreSQL 16，库名 `strideos`
- 连接串见本地 `.env.local`（gitignored）

---

## 4. 本地开发启动

```bash
git clone https://github.com/z17code/StrideOS.git
cd StrideOS
cp .env.example .env.local
# 编辑 .env.local：DATABASE_URL / SESSION_SECRET / ADMIN_PASSWORD / AI_*
npm install
npm run db:migrate   # 或 npm run db:push
npm run db:seed
npm run dev
```

打开 http://localhost:3000

### 生产库 schema 同步（改 schema 后必做）

```powershell
$env:DATABASE_URL="（Vercel 生产 Neon 连接串）"
npm run db:migrate
# 若迁移尚未覆盖最新字段，可临时：
# npm run db:push
```

---

## 5. 关键脚本

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产构建 |
| `npm run lint` | Next.js lint |
| `npm run typecheck` | TypeScript 检查 |
| `npm test` | Vitest 单次跑 |
| `npm run test:watch` | Vitest watch |
| `npm run db:push` | 把 schema 推到当前 `DATABASE_URL` |
| `npm run db:generate` | 生成 Drizzle 迁移 SQL |
| `npm run db:migrate` | 执行迁移 SQL |
| `npm run db:studio` | 打开 Drizzle Studio |
| `npm run db:seed` | 创建管理员 |

---

## 6. 数据库 Schema 概览

| 表 | 说明 |
|----|------|
| `users` | 用户 |
| `sessions` | 登录会话 |
| `invite_codes` | 邀请码 |
| `password_reset_tokens` | 密码重置令牌 |
| `runner_profiles` | 跑者档案（含 `onboarding_completed_at` / `onboarding_skipped_at`） |
| `race_goals` | 比赛目标（单活跃） |
| `plan_versions` | 计划版本（含 `label` / `version_number` / `starts_on` / `ends_on` / `warnings`） |
| `plan_workouts` | 计划课表（含 `phase` / `is_quality`） |
| `activities` | 训练记录（`workout_type` 为 **text**；`mutation_id` 幂等） |
| `daily_checkins` | 每日打卡 |
| `adjustment_proposals` | 调课提案 |
| `strength_sessions` | 力量记录（`template_id` 可空；`exercises` JSON；`duration_min`） |
| `shoes` | 跑鞋（`is_retired` 软退役） |
| `race_strategies` | 比赛策略 |

迁移文件：
- `drizzle/0000_phase1_init.sql` — 核心表
- `drizzle/0001_phase2_planning.sql` — 计划字段扩展、race workout type、单活跃约束
- `drizzle/0002_phase4_strategy.sql` — `race_strategies`
- `drizzle/0003_schema_alignment.sql` — 回写 db:push 期间的增量字段（onboarding skip、plan label、strength 自定义、activities text 等）

> 历史库若已用 `db:push` 对齐：`0000`–`0003` 均为幂等（`IF NOT EXISTS` / `duplicate_object` 捕获 / 条件改类型），可安全补跑 `db:migrate` 写入迁移历史。

---

## 7. 重要注意事项

### 密码与密钥
- `.env.local` 被 gitignore，**不要提交**
- Vercel 环境变量是线上秘密源
- `SESSION_SECRET` 变更会使所有登录失效
- **AI_API_KEY 禁止写入仓库 / HANDOFF 明文以外的聊天记录应轮换**

### 数据库
- 开发与生产推荐 `db:migrate`；`db:push` 仅作应急
- Neon 连接串末尾 `?sslmode=require` 不能去掉
- 改 schema 后：本地 `db:generate` → 提交迁移 → 对生产 `db:migrate`

### 认证
- Cookie + 服务端 Session；生产 Cookie `secure`
- Cookie 名 `strideos_session`，30 天

### API 约定
- `/api/v1/*`
- `jsonOk` / `jsonCreated` / `jsonError`
- `requireUser()` 认证
- 中文错误提示

### Client / Server 边界（重要）
- **Client 组件不要 import** `@/db` 或任何会拉 `postgres` 的 service
- 力量模板常量在 `src/lib/strength/templates.ts`（纯数据）
- DB 逻辑在 `src/lib/strength/service.ts`（仅 API / Server 使用）

### 已知限制
- 计划引擎为确定性算法，无 AI 参与生成
- 单用户一个活跃比赛目标
- 跑鞋退役为软删除（`isRetired`）
- i18n 目前覆盖导航 + 我的页，其它页面仍以中文文案为主
- PWA 为轻量壳缓存，不做离线写操作
- 「跑步路线记录集成」仍未做（依赖外部 GPS/GPX 源）
- 用户暂无自助改密（文案引导联系管理员）

### 网络
- 旧 Supabase 已弃用；生产用 Neon

### 仓库卫生
- 不要提交：`_write_files.py`、`test-results.txt`、`tsc-*.txt`、`.claude/`、本地 IDE 缓存
- 见 `.gitignore`

---

## 8. 目录结构（关键新增）

```
public/
  manifest.webmanifest
  sw.js
  icons/
src/
  app/
    (app)/plan/                 # 计划 + 导出按钮
    api/v1/plans/[versionId]/export/  # ics|md|pdf
    api/v1/me/locale/           # 语言偏好
    api/v1/adjustments/         # 调课列表 / propose / confirm / reject / revert
  components/
    pwa-register.tsx
    locale-switcher.tsx
    training/plan-export-buttons.tsx
    training/plan-version-history.tsx
  lib/
    i18n/dictionaries.ts
    i18n/server.ts
    plans/export.ts
    strength/templates.ts       # 可 env 覆盖
    strength/service.ts
    reports/ai.ts               # OpenAI-compatible
```

---

## 9. API 摘要

### 认证 / 我的
| 方法 | 路径 |
|------|------|
| POST | `/api/v1/auth/register` / `login` / `logout` / `reset-password` |
| GET  | `/api/v1/me` |
| POST | `/api/v1/me/locale` body `{ locale: "zh-CN" \| "en" }` |
| GET/PUT | `/api/v1/me/profile` |

### Onboarding / 目标 / 计划
| 方法 | 路径 | 备注 |
|------|------|------|
| GET  | `/api/v1/onboarding/status` | |
| POST | `/api/v1/onboarding/complete` | `{ skip: true }` 跳过 |
| GET/POST | `/api/v1/goals` | |
| PUT/DELETE | `/api/v1/goals/:id` | |
| GET  | `/api/v1/plans` / `current` | |
| POST | `/api/v1/plans/generate` | |
| GET/PATCH/DELETE | `/api/v1/plans/:versionId` | PATCH label；POST 激活 |
| GET  | `/api/v1/plans/:versionId/export?format=ics\|md\|pdf` | |

### 追踪 / 调课 / 报告
| 方法 | 路径 |
|------|------|
| GET/POST | `/api/v1/check-ins`、`/activities` |
| GET/PUT/DELETE | `/api/v1/activities/:id` |
| GET  | `/api/v1/adjustments` |
| POST | `/api/v1/adjustments/propose` |
| PUT  | `/api/v1/adjustments/:id/confirm`、`reject` |
| POST | `/api/v1/adjustments/:id/revert` |
| GET  | `/api/v1/reports/weekly`、`monthly`、`trends` |

### 工具
| 方法 | 路径 | 备注 |
|------|------|------|
| GET/POST | `/api/v1/shoes` | `?active=1` 未退役 |
| GET/PUT/DELETE | `/api/v1/shoes/:id` | |
| GET/POST | `/api/v1/strength` | `?templates=1` 模板列表 |
| GET/PUT/DELETE | `/api/v1/strength/:id` | |
| GET/POST | `/api/v1/strategies` | `save: true` 才写库 |
| GET/DELETE | `/api/v1/strategies/:id` | |

### 管理员
| 方法 | 路径 | 备注 |
|------|------|------|
| GET  | `/api/v1/admin/users` | 用户列表 |
| PUT  | `/api/v1/admin/users/:id` | 启停等 |
| GET/POST | `/api/v1/admin/invite-codes` | |
| DELETE | `/api/v1/admin/invite-codes/:id` | |
| POST | `/api/v1/admin/reset-token` | 生成重置令牌 |

---

## 10. 测试

```bash
npm test
```

主要测试文件：
- `src/lib/plans/engine.test.ts`
- `src/lib/plans/engine.property.test.ts`
- `src/lib/plans/export.test.ts`（导出）
- `src/lib/adjustments/engine.test.ts`
- `src/lib/activities/service.test.ts`
- `src/lib/auth/password.test.ts`
- `src/lib/reports/ai.test.ts`
- `src/lib/strategy/engine.test.ts`

---

## 11. 后续可能方向

- [x] 力量训练模板可配置化（`STRENGTH_TEMPLATES_JSON`）
- [x] AI 评语接入真实 LLM（配置 `AI_*`）
- [x] 训练计划导出 PDF / iCal
- [x] 多语言支持（基础版 zh/en）
- [x] 移动端 PWA（基础版）
- [x] 将 `db:push` 字段回写为正式 drizzle 迁移文件（`0003_schema_alignment`）
- [ ] 跑步路线记录集成（GPX / 第三方）
- [ ] 完整 i18n 覆盖所有页面
- [ ] 用户自助修改密码

---

## 12. 联系与访问

- **GitHub**：https://github.com/z17code/StrideOS
- **线上地址**：Vercel 项目仪表盘
- **Neon 生产库**：Vercel `DATABASE_URL`
- **本地**：`localhost:5432` / 库 `strideos`

### Vercel AI 环境变量配置步骤
1. Vercel → 项目 → Settings → Environment Variables
2. 新增（Production / Preview 都勾选）：
   - `AI_BASE_URL` = `https://apihub.agnes-ai.com/v1`
   - `AI_API_KEY` = （你的 key）
   - `AI_MODEL` = `agnes-2.0-flash`
3. 保存后 **Redeploy** 一次，否则旧实例读不到新变量

---

*最后更新：2026-07-14 — 文档与 README 对齐；补全 API/脚本；正式迁移 0003 回写 schema 增量*
