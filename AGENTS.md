# StrideOS — AI / Agent 速览

> 给 Codex / Claude / Cursor 等后续 Agent 的**最短必要上下文**。  
> 完整产品与运维细节见 [HANDOFF.md](./HANDOFF.md)；对外说明见 [README.md](./README.md)。  
> **先读本文再大范围扫仓库**，避免重复摸底。

**状态基准**：2026-07-15 · GitHub `main` · 仓库 https://github.com/z17code/StrideOS

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
src/app/admin/          # 管理员 UI（users / invites）
src/app/api/v1/         # REST API
src/components/         # UI + theme + layout + training/*
src/db/schema.ts        # 唯一 schema 源
src/lib/
  auth/                 # session / password / guards
  plans/                # PlanEngine + service + export
  adjustments/          # 调课规则引擎
  checkins/ activities/ reports/ shoes/ strength/ strategy/
  validators/           # zod
  i18n/                 # dictionaries + server locale
  datetime.ts           # 上海时区日期工具
drizzle/                # 正式迁移 SQL（0000…0004）
capacitor.config.ts     # Android WebView 壳（server.url → 生产站）
capacitor-www/          # Capacitor 占位页
android/                # Capacitor Android 工程
```

---

## 4. 近期已修坑（2026-07-15，commit 含 UX/admin）

接手时**不要回退**这些行为：

1. **打卡 POST** 必须带 `date`（或服务端用 `todayInShanghai()` 兜底）。前端 `today/page.tsx` 已发上海日期。  
2. **周历** 到计划首/末周时隐藏上一周/下一周按钮（`weekly-calendar.tsx`）。  
3. **成绩/目标时间** 用「时/分/秒」三框（`duration-fields.tsx` + onboarding），不要改回自由文本 `h:mm:ss`。  
4. **外观**：`system | light | dark`，localStorage `strideos_theme`；`ThemeProvider` + `globals.css` 的 `.dark` + `@custom-variant dark`。  
5. **帮助与反馈**：微信号 `z17code`（「我的」页）。  
6. **移动端底栏**：需要 `active:` / `touch-manipulation` 按压反馈。  
7. **管理员用户**：可改 `username`、`adminNote`（迁移 `0004_user_admin_note`）；`PUT /api/v1/admin/users/:id` body 可含 `isActive` / `username` / `adminNote`。  
8. **users.adminNote**：schema 字段 `admin_note`；列表 API 已返回。
9. **Android Capacitor 壳**：`capacitor.config.ts` → `https://stride-os-livid.vercel.app`，包名 `com.strideos.app`；WebView 加载线上站，非离线原生 App。
10. **登录 API 错误可读**：`POST /api/v1/auth/login` 捕获 DB 异常并返回 JSON；只查登录必要字段（不依赖 `admin_note`）；空 500 不再误报为「网络错误」。诊断：`GET /api/v1/health`。

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
工具：shoes / strength / race(VDOT 策略)
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

*最后文档维护提醒写入：2026-07-15（含 Capacitor Android 壳）*

