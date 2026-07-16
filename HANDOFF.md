# StrideOS — 交接文档

> 本文档面向后续接手开发的工程师与 AI Agent。所有信息基于 **2026-07-15** 项目状态。
>
> **AI 优先读 [AGENTS.md](./AGENTS.md)**（最短上下文）；本文是完整交接。

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
- **Android**：Capacitor WebView 壳（`capacitor.config.ts` → 加载生产 URL，包名 `com.strideos.app`）
- **i18n**：Cookie 语言偏好（`zh-CN` / `en`），导航与「我的」页已接入

对外简版说明见 [README.md](./README.md)。

---

## 2. 已完成功能

### Phase 1 — 基础骨架
- 邀请码注册 / 登录 / 登出 / 密码重置 / **自助注销账号**
- 管理员后台（用户启停、**备注/改用户名**、**永久注销**、邀请码、重置令牌）
- 响应式导航（移动端底栏 / 桌面侧栏）
- Drizzle schema：users / sessions / invite_codes / password_reset_tokens

### Phase 2 — 训练计划
- 入门问卷（Onboarding）+ 跑者档案（成绩/目标时间用**时分秒三框**）
- **可跳过 onboarding**（`runner_profiles.onboarding_skipped_at`；API：`POST /onboarding/complete` + `{ skip: true }`）
- 比赛目标 CRUD（单活跃目标约束）
- 确定性 PlanEngine（8–24 周，阶段分配 / 递进 / 减量 / 长跑上限）
- 计划版本持久化与生成 API
- 响应式周历 + 课表明细 + **版本历史（重命名 / 激活 / 删除）**
- **计划导出**：iCal（`.ics`）/ Markdown / 打印转 PDF

### Phase 3 — 训练追踪
- 每日打卡（疲劳 1–5 / 疼痛 0–10；**date 用 Asia/Shanghai，缺省服务端补今天**）
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
- **/tools**：hub / predict / pace / bmi / shoes / strength / race
- **成绩预测**（纯前端）：近三个月成绩 → VDOT 锚定 → 各距离等价成绩与表现评级（优秀/良好/一般/较差）；逻辑 `src/lib/tools/predict.ts`
- **配速计算器**（纯前端）：里程 + 用时 / 配速 / 圈速（400m）任意一项驱动互算；`src/lib/tools/pace.ts`
- **BMI 计算器**（纯前端）：中国成人区间 + 标准体重（BMI 22）；`src/lib/tools/bmi.ts`

### 平台能力（2026-07-14 增补）
- 移动端 PWA（manifest + service worker 基础缓存）
- **Android Capacitor WebView 壳**（2026-07-15）：加载 `https://stride-os-livid.vercel.app`，非原生重写
- 界面语言切换（中/英，Cookie `strideos_locale`）
- Client 组件禁止直接 import DB service（力量模板已拆到 `templates.ts`）

### UX / 管理（2026-07-15）
- **外观主题**：跟随系统 / 浅色 / 深色（`localStorage` key `strideos_theme`；`ThemeProvider` + `globals.css` `.dark`）
- **帮助与反馈**：微信号 `z17code`（「我的」页）
- **计划周历**：到计划边界隐藏上一周/下一周按钮
- **移动端底栏/按钮**：按压反馈（`active:` + `touch-manipulation`）
- **计划页工具栏**：移动端 2 列网格布局
- **管理员用户**：`adminNote` 备注 + 修改 `username`（迁移 `0004_user_admin_note`）

---

## 3. 当前线上环境


### Security hardening (2026-07-15)
- Login lockout: ~20 fails / 15m per IP, 5 fails / 15m per username -> 429 TOO_MANY_ATTEMPTS + Retry-After
- Register / reset-password: IP rate limits (invite code / token brute-force)
- Implementation: src/lib/security/* + table auth_rate_limits (migration 0005)
- Origin/Referer checks (middleware + auth routes) for CSRF mitigation; cookies HttpOnly + SameSite=Lax + Secure in prod
- Security headers in next.config.mjs (CSP, HSTS, X-Frame-Options, nosniff, ...)
- Password policy: min 8, letter+digit, block common weak passwords; dummy hash verify for unknown users
- Register / reset-password validation errors return the first concrete Zod message (e.g. 「密码需同时包含字母和数字」) instead of only generic 「参数校验失败」; register page pre-validates with the same schema and shows password rule hints
- Optional env: APP_URL / NEXT_PUBLIC_APP_URL (extra allowed origins); FORCE_SECURE_COOKIES=1

### Vercel 部署
- **仓库**：https://github.com/z17code/StrideOS
- **CI**：.github/workflows/ci.yml（push/PR → typecheck + test）
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

## 3b. Android / Capacitor（WebView 壳）

> 2026-07-15 增补。这是**可选**的 Android 安装包装法，**不是**原生客户端重写。

| 项 | 值 |
|----|-----|
| 包名 `appId` | `com.strideos.app` |
| App 名 | `StrideOS` |
| 加载 URL | `https://stride-os-livid.vercel.app` |
| 配置文件 | `capacitor.config.ts` |
| 本地占位 webDir | `capacitor-www/`（因使用 `server.url`，实际启动后直接打开线上站） |
| 原生工程 | `android/`（`npx cap add android` 生成） |

### 打包步骤

1. 安装 [Android Studio](https://developer.android.com/studio)（含 Android SDK）
2. 仓库根目录：`npm install`（已含 `@capacitor/*`）
3. `npm run cap:sync`
4. `npm run cap:open`（或 Android Studio 打开 `android/`）
5. `Build > Build Bundle(s) / APK(s) > Build APK(s)`
6. Debug APK：`android/app/build/outputs/apk/debug/app-debug.apk`

命令行（需已配置 `ANDROID_HOME` / SDK）：

```bash
cd android
./gradlew assembleDebug   # Windows: gradlew.bat assembleDebug
```

### 行为说明

- 登录 Cookie、计划、打卡、报告全部仍走线上 Next.js + Neon
- 换域名时改 `capacitor.config.ts` 的 `server.url` 后执行 `npm run cap:sync`
- 正式上架需要签名 keystore（debug 包仅供内测）
- 本机若无 Android SDK，无法直接产出 APK
- **APK 用户下载入口**（「我的」页）：`public/downloads/strideos-android.apk` → `/downloads/strideos-android.apk`
- **隐私**：用户面**不**展示 GitHub Releases 外链（避免暴露仓库账号）；发版只需更新站点 `public/downloads/` 下的 APK
- 安装说明：WebView 壳、需联网访问生产站；非 Play 商店包需允许未知来源；debug 签名仅内测


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
| `npm run cap:sync` | 同步 Capacitor → `android/` |
| `npm run cap:open` | Android Studio 打开工程 |
| `npm run cap:copy` | 复制 web 资源到 Android |

---

## 6. 数据库 Schema 概览

| 表 | 说明 |
|----|------|
| `users` | 用户 |
| `sessions` | 登录会话 |
| `invite_codes` | 邀请码；**单次使用永久有效消耗**：`usedAt` 为已用标记（用户注销后 `usedByUserId` 置空但 `usedAt` 保留，不可复用） |
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
- `drizzle/0004_user_admin_note.sql` --- users.admin_note
- `drizzle/0005_auth_rate_limits.sql` --- auth_rate_limits lockout table

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
- Android Capacitor 仅为 WebView 壳：无离线写入；依赖网络访问生产站；本机出 APK 需 Android Studio/SDK
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
capacitor.config.ts
capacitor-www/
android/                 # Capacitor Android 工程
src/
  app/
    (app)/plan/                 # 计划 + 导出按钮
    api/v1/plans/[versionId]/export/  # ics|md|pdf
    api/v1/me/locale/           # 语言偏好
    api/v1/adjustments/         # 调课列表 / propose / confirm / reject / revert
  components/
    pwa-register.tsx
    locale-switcher.tsx
    theme-provider.tsx / theme-switcher.tsx
    ui/duration-fields.tsx          # 时/分/秒输入
    training/plan-export-buttons.tsx
    training/plan-version-history.tsx
    training/weekly-calendar.tsx    # 边界隐藏左右键
  app/(app)/tools/
    page.tsx                    # 工具 hub
    predict/page.tsx            # 成绩预测
    pace/page.tsx               # 配速计算器
    bmi/page.tsx                # BMI
    race/ shoes/ strength/
  lib/
    i18n/dictionaries.ts
    i18n/server.ts
    plans/export.ts
    strength/templates.ts       # 可 env 覆盖
    strength/service.ts
    reports/ai.ts               # OpenAI-compatible
    tools/predict.ts            # 成绩预测（VDOT 锚定）
    tools/pace.ts               # 配速互算
    tools/bmi.ts                # BMI
    tools/tools.test.ts
```

---

## 9. API 摘要

### 认证 / 我的
| 方法 | 路径 |
|------|------|
| POST | `/api/v1/auth/register` / `login` / `logout` / `reset-password` |
| GET  | `/api/v1/health` | 公共就绪探测（DB `select 1`，无密钥） |
| GET  | `/api/v1/me` |
| DELETE | `/api/v1/me` | 自助注销；body `{ confirmation: "确认注销并永久删除全部数据" }` |
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
| PUT  | `/api/v1/admin/users/:id` | `isActive` / `username` / `adminNote` |
| DELETE | `/api/v1/admin/users/:id` | 永久注销；body `{ confirmation: "确认注销该用户并永久删除全部数据" }`；不可注销自己/唯一管理员 |
| GET/POST | `/api/v1/admin/invite-codes` | |
| DELETE | `/api/v1/admin/invite-codes/:id` | 仅未使用（`usedAt` 为空）可撤销；已用码不可撤销 |
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
- `src/lib/tools/tools.test.ts`（成绩预测 / 配速 / BMI）

---

## 11. 后续可能方向

- [x] 力量训练模板可配置化（`STRENGTH_TEMPLATES_JSON`）
- [x] AI 评语接入真实 LLM（配置 `AI_*`）
- [x] 训练计划导出 PDF / iCal
- [x] 多语言支持（基础版 zh/en）
- [x] 移动端 PWA（基础版）
- [x] Android Capacitor WebView 壳（加载生产站）
- [x] 网站「我的」页 Android APK 下载（/downloads/strideos-android.apk；用户面不展示 GitHub 链接）
- [x] GitHub CI / Dependabot / Issue+PR 模板 / MIT LICENSE
- [x] 将 `db:push` 字段回写为正式 drizzle 迁移文件（`0003_schema_alignment`）
- [x] 打卡 date 校验 / 上海时区（2026-07-15）
- [x] 外观主题 system/light/dark
- [x] 管理员用户备注与改名（`0004_user_admin_note`）
- [x] 成绩预测 / 配速计算器 / BMI（`/tools/predict|pace|bmi`，纯前端）
- [x] Security: login lockout/rate-limit, headers, origin checks (0005_auth_rate_limits)
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

## 13. 文档维护约定（强制）

不要只在对话里提醒「记得改文档」——**约定写在仓库里**，后续人类与 AI 都按此执行。

凡有以下变更，**与代码同一批提交**必须更新文档：

| 变更类型 | 必改文档 |
|----------|----------|
| 用户可见行为、坑点、禁止回退逻辑 | [AGENTS.md](./AGENTS.md) **§4** |
| Agent 约定 / 目录 / 命令 | [AGENTS.md](./AGENTS.md) 对应节 |
| 功能、环境、API、迁移、部署、后续方向 | **本文**对应章节，并更新文首状态日期与文末「最后更新」 |
| 对外说明 / 功能勾选 | [README.md](./README.md) |

**提交前自检：**

1. `AGENTS.md` §4 与当前 main 行为一致  
2. 本文日期、API 表、迁移表与代码一致  
3. 新 `drizzle/000x_*.sql` 已在本文与 AGENTS 中有入口说明  

*Last update: 2026-07-15 — Register validation: surface concrete Zod messages + password rule hints*

