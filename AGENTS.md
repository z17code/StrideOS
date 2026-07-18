# StrideOS — AI / Agent 速览

> 给 Codex / Claude / Cursor 等后续 Agent 的**最短必要上下文**。  
> 完整产品与运维细节见 [HANDOFF.md](./HANDOFF.md)；对外说明见 [README.md](./README.md)。  
> **先读本文再大范围扫仓库**，避免重复摸底。

**状态基准**：2026-07-18 · GitHub `main` · 仓库 https://github.com/z17code/StrideOS

---

## 1. 一句话

邀请制长跑训练 MVP：Next.js 15 App Router + Drizzle/Postgres(Neon) + 自研 session 认证。计划由**确定性引擎**生成（非 LLM）；AI 仅用于周/月报评语。

---

## 2. 动手前约定

| 规则 | 说明 |
|------|------|
| 时区 | 业务日期一律 **Asia/Shanghai** `YYYY-MM-DD`；用 `src/lib/datetime.ts`（`todayInShanghai` 等）。**禁止** `toISOString().slice(0,10)` 当「今天」。 |
| Client/Server | Client 组件**禁止** import DB service / `postgres`。模板类纯数据可拆 `templates.ts` 这类无 DB 文件。 |
| API 形态 | `src/app/api/v1/**` + zod validators in `src/lib/validators/*` + 业务在 `src/lib/*/service.ts`。鉴权：`requireUser` / `requireAdmin`（`src/lib/auth/guards.ts`）。 |
| Schema 变更 | 改 `src/db/schema.ts` → 写 `drizzle/000x_*.sql` → 更新 `drizzle/meta/_journal.json` → **本地/生产都** `npm run db:migrate`。Vercel **不会**自动迁移。 |
| 密钥 | `.env.local` / Vercel 环境变量；**永不**提交 key。 |
| 中文 UI | 用户面以中文为主；i18n 目前只覆盖导航 +「我的」（Cookie `strideos_locale`）。 |
| 测试 | 引擎/核心逻辑用 Vitest；改 Plan/Adjustment/Auth/Strategy 时尽量补测。 |
| 不要提交 | `_write_files.py`、`tsc-*.txt`、`test-results.txt`、`.claude/`、IDE 缓存（见 `.gitignore`）。 |

---

## 3. 目录地图（只记入口）

```
src/app/(app)/          # 登录后主站：today / plan / activity / insights / tools / me / onboarding
src/app/admin/          # 管理员 UI（users / invites / security / audit）
src/app/api/v1/         # REST API
src/components/         # UI + theme + layout + training/*
src/db/schema.ts        # 唯一 schema 源
src/lib/
  admin/                # 管理端 stats / audit / user summary
  auth/                 # session / password / guards
  plans/                # PlanEngine + service + export
  adjustments/          # 调课规则引擎
  checkins/ activities/ reports/ shoes/ strength/ strategy/
  validators/           # zod
  i18n/                 # dictionaries + server locale
  datetime.ts           # 上海时区日期工具
drizzle/                # 正式迁移 SQL（0000…0006）
capacitor.config.ts     # Android WebView 壳（server.url → 生产站）
capacitor-www/          # Capacitor 占位页
android/                # Capacitor Android 工程
```

---

## 4. 近期已修坑（2026-07-17，勿回退）

接手时**不要回退**这些行为：

1. **打卡 POST** 必须带 `date`（或服务端用 `todayInShanghai()` 兜底）。前端 `today/page.tsx` 已发上海日期。  
2. **周历** 到计划首/末周时隐藏上一周/下一周按钮（`weekly-calendar.tsx`）。  
3. **成绩/目标时间** 用「时/分/秒」三框（`duration-fields.tsx` + onboarding），不要改回自由文本 `h:mm:ss`。  
4. **外观**：`system | light | dark`，localStorage `strideos_theme`；`ThemeProvider` + `globals.css` 的 `.dark` + `@custom-variant dark`。**主题色**（强调色）：localStorage `strideos_accent`（`zinc|emerald|sky|amber|rose|violet|orange`，默认 `emerald`），经 `html[data-accent]` 覆盖 `--color-primary` / `--color-ring`；「我的」偏好里用色板切换；boot script 同步 `data-accent` 防闪烁。  
5. **帮助与反馈**：微信号 `z17code`（「我的」页）。  
6. **移动端底栏**：需要 `active:` / `touch-manipulation` 按压反馈。  
7. **管理员用户**：可改 `username`、`adminNote`（迁移 `0004_user_admin_note`）；`PUT /api/v1/admin/users/:id` body 可含 `isActive` / `username` / `adminNote`。  
8. **users.adminNote**：schema 字段 `admin_note`；列表 API 已返回。
9. **Android Capacitor 壳**：`capacitor.config.ts` → `https://stride-os-livid.vercel.app`，包名 `com.strideos.app`；WebView 加载线上站，非离线原生 App。
10. **APK 下载**：
    - 网站「我的」：`/downloads/strideos-android.apk`（`public/downloads/`）— **仅此用户可见入口**，不展示 GitHub 链接（避免暴露仓库账号）。
    - 发新版时更新 `public/downloads/strideos-android.apk`；包为 WebView 壳，非离线原生 App。
11. **登录 API 错误可读**：`POST /api/v1/auth/login` 捕获 DB 异常并返回 JSON；只查登录必要字段（不依赖 `admin_note`）；空 500 不再误报为「网络错误」。诊断：`GET /api/v1/health`。
12. **移动端 / APK UI 层次**：页面灰底 + 白/深卡片分离；底栏与顶栏用 `env(safe-area-inset-*)`（`safe-pb` / `safe-pt` + main `pb`）；viewport `viewportFit: "cover"`。底栏 active 用圆形高亮，保留 `touch-manipulation` / `active:`。

13. **工具计算器（纯前端）**：成绩预测 `/tools/predict`（VDOT 锚定 + 各距离表现评估）、配速计算器 `/tools/pace`（里程 + 用时/配速/圈速互算）、BMI `/tools/bmi`；逻辑在 `src/lib/tools/*`。配速/BMI **无默认示例数据**（仅类型预选如 10 公里里程；用时/配速/身高体重为空）。
14. **注册确认密码与校验提示**：`/register` 密码后有「确认密码」；不一致时前端拦截（「两次输入的密码不一致」），API 仍只收 `password`。密码策略：≥8 且须字母+数字，拦截常见弱口令；前端提示「至少 8 个字符，须同时包含字母和数字」，并在提交前用同一 `registerSchema` 预校验。校验失败时 API `message` 返回首条具体 Zod 文案（如「密码需同时包含字母和数字」），不再只显示笼统「参数校验失败」。
15. **深色模式顶底栏**：移动端底栏/顶栏用实色 `bg-card`（勿用 `bg-background/95` 等 opacity，Tailwind v4 在部分手机浏览器会回退到浅色硬编码）；active 圆点用 `bg-muted`；`ThemeProvider` 同步 `meta[name=theme-color]`。

16. **安全防护（auth + 全站）**：
   - 登录失败限流/锁定（DB 表 `auth_rate_limits`，迁移 `0005_auth_rate_limits`）：同 IP 15 分钟内约 20 次失败锁 15 分钟；同用户名 5 次失败锁 15 分钟；返回 `429 TOO_MANY_ATTEMPTS` + `Retry-After`。
   - 注册/重置密码按 IP 限流（防邀请码/令牌爆破）。
   - 未知用户也走假哈希校验，降低用户名枚举时序差异。
   - 密码策略：≥8 且含字母+数字，拦截常见弱口令；API JSON 体默认 ≤64KB。
   - CSRF 缓解：`middleware` + auth 路由对写操作校验 Origin/Referer；Cookie `HttpOnly` + `SameSite=Lax` + 生产 `Secure`。
   - 安全响应头：`next.config.mjs`（CSP / HSTS / X-Frame-Options DENY / nosniff / Referrer-Policy / Permissions-Policy）；`poweredByHeader: false`。
   - 逻辑在 `src/lib/security/*`；改限流阈值改 `rate-limit.ts` 的 policy 常量。


17. **注销账号（永久删除）**：
    - 用户「我的」页可自助注销：须完整输入确认文案 `确认注销并永久删除全部数据`（长文案防误触）；`DELETE /api/v1/me`。
    - 管理员用户管理可注销任意用户：确认文案 `确认注销该用户并永久删除全部数据`；`DELETE /api/v1/admin/users/:id`（body 含 confirmation）。
    - 服务：`permanentlyDeleteUser`（`src/lib/auth/delete-account.ts`）— 先删 `plan_versions`（因 `race_goal_id` RESTRICT），再删 `users`（其余表 cascade）；管理员创建的邀请码会改派给其他管理员。
    - **已用邀请码永久无效**：注册/占用以 `invite_codes.usedAt IS NOT NULL` 为准，不是 `usedByUserId`。用户注销后 FK 会把 `usedByUserId` SET NULL，但 `usedAt` 保留，码仍不可再次注册。
    - 禁止：管理端注销自己；注销系统中**唯一**管理员。停用（`isActive`）≠ 注销。

18. **已用邀请码永久无效（注销后不可复用）**：
    - 判定：`usedAt` 非空 = 已使用（注册查询、claim 条件、管理端状态/撤销均用 `usedAt`）。
    - `usedByUserId` 仅作软关联；用户永久删除时 ON DELETE SET NULL，**不得**据此把码重新标为可用。
    - 禁止回退到仅检查 `isNull(usedByUserId)` 的注册逻辑。

19. **邀请码删除 / 清空（硬删除，永久不可用）**：
    - 管理端明文显示邀请码；每行均可「删除」；底部「一键清空全部」。
    - 单删：`DELETE /api/v1/admin/invite-codes/:id`（可用/已用/已失效均可删）。
    - 清空：`DELETE /api/v1/admin/invite-codes`（删全部行）。
    - **硬删除**行 → 码字符串不存在，无法再注册；不占库空间。
    - 复制：clipboard API + `execCommand` 回退（修手机复制失败）；码文本 `select-all` 可长按手选。

20. **管理后台运维增强（P0/P1）**：
    - 概览 KPI：`GET /api/v1/admin/stats`（用户/邀请码/今日打卡/活跃计划）。
    - 用户：搜索 `?q=`、筛选 `?status=all|active|disabled|admin`；`GET /api/v1/admin/users/:id` 只读摘要（onboarding/目标/计划/打卡/会话数，不含训练全文）。
    - `users.lastLoginAt`（迁移 `0006_admin_ops`）：登录成功写入；列表展示最近登录。
    - 踢下线：`DELETE /api/v1/admin/users/:id/sessions`。
    - 限流管理：`/admin/security` + `GET/DELETE /api/v1/admin/rate-limits`（按 id/bucket/username 解锁）。
    - 审计：`admin_audit_logs` + `GET /api/v1/admin/audit-logs`；写操作 best-effort 记日志。
    - 重置令牌：返回 `resetPath`/`resetUrl`；生成时作废该用户旧未用令牌；`DELETE /api/v1/admin/reset-token` body `{userId}` 作废未用令牌；`/reset-password?token=` 预填。
    - 邀请码：过期预设 7/30/90/不过期；状态筛选；复制全部可用/新生成。



21. **工具箱扩展（纯前端 / 只读）**：hub 分组为「成绩与配速 / 身体与恢复 / 计划与装备 / 换算与修正」。新增：训练配速表、心率区间、分段配速表、间歇设计、长跑补给、热身放松拉伸、周负荷一览（读计划+活动，不写库）、比赛倒计时清单、备注模板、单位换算、坡度修正、配速↔功率、VDOT 说明；跑鞋页寿命进度条（默认 700 km）。计算器与清单逻辑在 `src/lib/tools/*`，**不新增 Neon 表**；勾选状态仅 localStorage。
22. **计划提示文案**：入库与展示只保留中文 `message`，不再拼接 `INSUFFICIENT_BASE:` 等英文 code；读旧数据时剥掉 `CODE: ` 前缀。

23. **用户面不暴露实现细节**（2026-07-16 `1cab480`）：
    - 登录/API 错误对用户只说「服务暂时不可用 / 繁忙 / 请稍后再试」，**不要**写 `db:migrate`、冷启动、DB 未配置、schema 过期等运维话术（错误 code 仍可内部使用）。
    - 工具 hub 与各工具描述用产品语言（成绩/配速/恢复/装备）；**不要**写「不占库」「只读不写库」「WebView 壳」等实现细节给普通用户。
    - 「我的」APK 文案用「安装包 / 内测版本」，不展示 GitHub Releases；实现层仍可在 HANDOFF 写 Capacitor/WebView。

---

## 5. 认证与角色

- 邀请码注册；session：scrypt 密码 + HttpOnly cookie。  
- `user.role === "admin"` → 进 `/admin`，**不要**进普通 `(app)` 主站（layout 会 redirect）。  
- 密码重置：管理员生成 token → 用户 `/reset-password`。用户**暂无**自助改密。

---

## 6. 核心业务链路

```
注册/登录 →（可选）onboarding → 比赛目标 → plans/generate
    → 周历执行 → 打卡 + 训练记录 → adjustments 调课 → insights 报告
工具：predict / paces / pace / splits / intervals / race / vdot / bmi / heart-rate / recovery / fueling / load / race-day / notes / shoes / units / grade / power / strength
```

- 计划生成：`src/lib/plans/engine.ts`（确定性）。  
- 调课：`src/lib/adjustments/engine.ts`（规则引擎，需用户确认）。  
- 报告 AI：`src/lib/reports/ai.ts`（OpenAI-compatible，`AI_*` env，超时走模板）。

---

## 7. 常用命令

```bash
npm run dev
npm run typecheck
npm test
npm run db:migrate    # 正式迁移（优先）
npm run db:push       # 应急对齐 schema
npm run db:seed       # 管理员种子
npm run cap:sync      # 同步 Capacitor → android
npm run cap:open      # Android Studio 打开工程
```

生产改 schema 后：对 Neon 的 `DATABASE_URL` 执行 `db:migrate`，再依赖 Vercel 的 `main` 自动部署。

---

## 8. 已知限制（勿当 bug 乱修）

- i18n 未铺满全站  
- 无 GPX/路线集成  
- 无用户自助改密  
- PWA 轻量缓存，不做离线写入  
- Android Capacitor WebView 壳（加载线上站；见 HANDOFF「Android / Capacitor」）  
- Neon 冷启动 2–5s  

---

## 9. 改代码时的推荐顺序

1. 读本文件相关小节 + `HANDOFF.md` 对应 Phase  
2. 定位 `validators` → `service` → `api/route` → 页面/组件  
3. 涉及日期/打卡/admin 用户时对照第 4 节「已修坑」  
4. `npm run typecheck`（+ 相关 `npm test`）  
5. 需要 schema 时补迁移，**提醒用户跑 migrate**

---

## 10. 文档维护约定（强制）

以后凡有**重大行为变更、schema/迁移、公开 API、环境变量、部署方式**变化，**必须在同一次改动里**同步更新文档，不要只改代码：

| 改了什么 | 至少更新 |
|----------|----------|
| 用户可见行为 / 已修坑 / 禁止回退的逻辑 | 本文件 **§4 近期已修坑** |
| 新约定、目录入口、命令 | 本文件对应小节 |
| 功能清单、API、运维、迁移、环境 | [HANDOFF.md](./HANDOFF.md) 对应章节 + 文首/文末日期 |
| 对外功能勾选、部署说明 | [README.md](./README.md)（若影响对外描述） |

检查清单（提交前）：

1. `AGENTS.md` §4 是否仍反映当前「不要回退」的行为  
2. `HANDOFF.md` 日期与相关 Phase / API / 迁移表是否对齐  
3. 若有新迁移：`drizzle/` + journal + HANDOFF 迁移说明  


24. **Cloudflare Turnstile（人机验证）**：
    - 登录 / 注册 / 重置密码：前端 widget + 服务端 `verifyTurnstileToken`（`src/lib/security/turnstile.ts`）。
    - Env：`NEXT_PUBLIC_TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY`；**未配置 Secret 时服务端跳过校验**（本地开发友好）。
    - Widget 模式：Managed。CSP 已允许 `challenges.cloudflare.com`（script/frame/connect）。
    - 密钥只放 Vercel / `.env.local`，勿提交仓库。

25. **TOTP 二次验证（验证器 App）**：
    - 可选开启；用户「我的」/ 管理员「安全」页绑定；扫码或手动密钥。
    - 登录：密码通过且已开启 2FA → 返回 `requires2fa` + `pendingToken`（不发 session）→ `POST /api/v1/auth/login/2fa` 校验 6 位码或备份码后再建 session。
    - Schema 迁移 `0007_totp_2fa`：`users.totp_*`、`totp_backup_codes`、`pending_2fa`。
    - Secret AES-GCM 加密（密钥来自 `TOTP_ENCRYPTION_KEY` 或 `SESSION_SECRET`）；备份码只显示一次、哈希入库。
    - 关闭 2FA 需当前验证码或未使用备份码。

*最后文档维护提醒写入：2026-07-17（文档对齐 main：§4 重编号 + 用户面文案策略；HANDOFF/README/.env.example 同步）*




