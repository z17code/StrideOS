# StrideOS — 交接文档

> 本文档面向后续接手开发的工程师。所有信息基于 2026-07-13 项目状态。

---

## 1. 项目概况

StrideOS 是面向大众进阶跑者的智能训练驾驶舱（邀请制 MVP）。

- **框架**：Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **UI**：Radix UI + Lucide 图标 + 手写少量组件（无 shadcn）
- **数据库**：Drizzle ORM + PostgreSQL（开发用本地，生产用 Neon）
- **认证**：自研 scrypt + HttpOnly Cookie（无第三方 Auth）
- **测试**：Vitest（单元测试 + fast-check 属性测试）
- **部署**：Vercel（已上线）

---

## 2. 已完成功能

### Phase 1 — 基础骨架
- 邀请码注册 / 登录 / 登出 / 密码重置
- 管理员后台（用户启停、邀请码、重置令牌）
- 响应式导航（移动端底栏 / 桌面侧栏）
- Drizzle schema：users / sessions / invite_codes / password_reset_tokens

### Phase 2 — 训练计划
- 入门问卷（Onboarding）+ 跑者档案
- 比赛目标 CRUD（单活跃目标约束）
- 确定性 PlanEngine（8–24 周，阶段分配 / 递进 / 减量 / 长跑上限）
- 计划版本持久化与生成 API
- 响应式周历 + 课表明细 + 版本历史

### Phase 3 — 训练追踪
- 每日打卡（疲劳 1–5 / 疼痛 0–10）
- 训练记录 CRUD（distance / duration / RPE / HR / pain / notes / mutationId 幂等）
- 智能调课引擎（5 条规则）+ 确认 / 忽略 / 撤销
- 周报 / 月报 / 趋势报告 + AI 评语（8s 超时 + 模板兜底）
- 三页 UI：/today / /activity / /insights

### Phase 4 — 工具与策略（最近完成）
- **VDOT 引擎**：Daniels-Gilbert 公式，含 `computeVdot` / `vdotToTrainingPaces` / `equivalentRaceTimes` / `negativeSplitStrategy` / `buildRaceStrategy`
- **跑鞋管理**：CRUD + 里程自动累加（创建活动时触发）+ 退役功能
- **力量训练**：5 个模板（core / hips / calves / balance / mobility）+ CRUD
- **比赛策略 API**：计算（不写库）+ 计算并保存两种模式
- **/tools 三页面**：hub / shoes / strength / race

---

## 3. 当前线上环境

### Vercel 部署
- **仓库**：https://github.com/z17code/StrideOS
- **主分支**：`main`，推送到 main 后 Vercel 自动重新部署
- **Vercel 环境变量**（生产 / 预览 / 开发均已配置）：
  - `DATABASE_URL`：Neon 云数据库连接串
  - `SESSION_SECRET`：已设置
  - `ADMIN_USERNAME`：`admin`
  - `ADMIN_PASSWORD`：已设置
  - `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`：当前为空（AI 评语使用模板兜底）

### 云端数据库（Neon）
- **连接串**：见 Vercel 环境变量 `DATABASE_URL`
- **项目名**：`neondb`
- **已有表**：Phase 1–4 全量 schema（含 race_strategies）
- **管理员账号**：已通过 `db:seed` 创建
- **注意**：Neon 免费版有自动休眠，首次访问可能需要几秒唤醒

### 本地开发数据库
- **本地**：PostgreSQL 16，Navicat 管理，数据库名 `strideos`
- **连接串**：见本地 `.env.local`（已被 `.gitignore`，不会上传）

---

## 4. 本地开发启动

```bash
# 1. 克隆仓库
git clone https://github.com/z17code/StrideOS.git
cd StrideOS

# 2. 复制环境变量模板
cp .env.example .env.local

# 3. 编辑 .env.local，填入本地数据库连接串
#    DATABASE_URL=postgresql://postgres:密码@localhost:5432/strideos
#    SESSION_SECRET=一长串随机字符
#    ADMIN_PASSWORD=你记得住的密码

# 4. 建表 + 创建管理员
npm run db:push
npm run db:seed

# 5. 启动
npm run dev
```

打开 http://localhost:3000

---

## 5. 关键脚本

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发服务器（localhost:3000） |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm test` | 运行全部 Vitest 测试（当前 105 个） |
| `npm run db:push` | 直接把 schema 推到数据库（开发期用） |
| `npm run db:generate` | 生成 Drizzle 迁移 SQL 文件 |
| `npm run db:migrate` | 执行迁移 SQL |
| `npm run db:seed` | 创建管理员账号 |

---

## 6. 数据库 Schema 概览

| 表 | 说明 |
|----|------|
| `users` | 用户（用户名/密码哈希/角色/是否激活） |
| `sessions` | 登录会话（token hash + 过期时间） |
| `invite_codes` | 邀请码 |
| `password_reset_tokens` | 密码重置令牌 |
| `runner_profiles` | 跑者档案（onboarding 数据） |
| `race_goals` | 比赛目标（单活跃目标唯一约束） |
| `plan_versions` | 训练计划版本 |
| `plan_workouts` | 计划课表 |
| `activities` | 训练记录（含 mutationId 幂等约束） |
| `daily_checkins` | 每日打卡 |
| `adjustment_proposals` | 调课提案 |
| `strength_sessions` | 力量训练记录 |
| `shoes` | 跑鞋 |
| `race_strategies` | VDOT 比赛策略（Phase 4 新增） |

迁移文件：
- `drizzle/0000_phase1_init.sql` — 基础表
- `drizzle/0001_phase2_planning.sql` — 计划相关扩展
- `drizzle/0002_phase4_strategy.sql` — race_strategies 表

---

## 7. 重要注意事项

### 密码与密钥
- `.env.local` 被 `.gitignore` 忽略，**不要手动提交**
- Vercel 环境变量是线上唯一的秘密存储地
- `SESSION_SECRET` 变更会导致所有用户登录失效

### 数据库
- 开发用 `db:push`（直接同步 schema），生产也用 `db:push`（因为 Vercel 没有迁移执行环境）
- Neon 免费版有自动休眠策略，首次访问可能需 2–5 秒
- Neon 连接串末尾的 `?sslmode=require` 不能去掉

### 认证
- 无第三方 Auth，纯 Cookie + 服务端 Session
- Cookie 在 production 自动设 `secure` flag
- `SESSION_COOKIE` 名为 `strideos_session`，有效期 30 天
- 密码用 scrypt 哈希（见 `src/lib/auth/password.ts`）

### API 约定
- 全部 API 在 `/api/v1/` 下
- 统一响应格式：`jsonOk(data)` → 200，`jsonCreated(data)` → 201，`jsonError(code, message)` → 4xx/5xx
- 统一认证：`requireUser()`  guards
- 中文错误提示

### 已知限制
- AI 评语功能目前无 API Key，使用模板兜底（8 秒超时）
- 计划引擎为确定性算法，无 AI 参与
- 单用户只有一个活跃比赛目标（DB 级唯一约束）
- 力量训练模板硬编码在 `src/lib/strength/service.ts` 的 `STRENGTH_TEMPLATES`
- 跑鞋退役为软删除（`isRetired` flag），未退役跑鞋在创建活动时自动累加里程

### 网络相关（重要！）
- Supabase（`.supabase.co`）在国内 DNS 解析不稳定
- 当前生产使用 **Neon**（`.neon.tech`），国内访问正常
- 若未来换数据库，注意更新 Vercel 环境变量中的 `DATABASE_URL`

---

## 8. 目录结构

```
src/
├── app/
│   ├── (app)/              # 登录后页面
│   │   ├── activity/       # 训练记录
│   │   ├── insights/       # 数据洞察
│   │   ├── me/             # 个人资料
│   │   ├── onboarding/     # 入门问卷
│   │   ├── plan/           # 训练计划
│   │   └── tools/          # Phase 4 工具页
│   │       ├── page.tsx    # hub（三卡片入口）
│   │       ├── shoes/      # 跑鞋管理
│   │       ├── strength/   # 力量训练
│   │       └── race/       # VDOT 比赛策略
│   ├── admin/              # 管理员后台
│   └── api/v1/             # REST API
│       ├── activities/
│       ├── adjustments/
│       ├── check-ins/
│       ├── goals/
│       ├── plans/
│       ├── reports/
│       ├── shoes/          # Phase 4 新增
│       ├── strength/       # Phase 4 新增
│       └── strategies/     # Phase 4 新增
├── components/
│   ├── layout/             # 导航等布局组件
│   ├── onboarding/         # 问卷向导
│   ├── training/           # 计划相关组件
│   └── ui/                 # 基础 UI 组件（Button/Card/Input/Label/Select/Textarea）
├── db/
│   ├── index.ts            # Lazy DB client
│   ├── schema.ts           # Drizzle schema 定义
│   ├── migrate.ts          # 迁移执行脚本
│   ├── seed.ts             # 管理员种子
│   └── load-env.ts         # 环境变量加载（Node 脚本用）
└── lib/
    ├── activities/         # 训练记录 service
    ├── adjustments/        # 调课引擎
    ├── auth/               # 认证（session / password / guards / onboarding-gate）
    ├── checkins/           # 打卡 service
    ├── plans/              # 计划引擎 + service
    ├── reports/            # 报告 + AI 评语
    ├── strategy/           # Phase 4: VDOT 引擎
    │   ├── engine.ts       # 纯函数（Daniels 公式）
    │   ├── engine.test.ts  # 25 个测试
    │   └── service.ts      # DB 操作
    ├── shoes/              # Phase 4: 跑鞋 service
    ├── strength/           # Phase 4: 力量训练 service
    └── validators/         # Zod schemas
```

---

## 9. 测试

```bash
npm test              # 全部测试（当前 105 个，7 个文件）
npm run test:watch    # 监听模式
```

测试文件清单：
- `src/lib/plans/engine.test.ts` — PlanEngine 逻辑
- `src/lib/plans/engine.property.test.ts` — fast-check 属性测试
- `src/lib/adjustments/engine.test.ts` — 调课规则
- `src/lib/activities/service.test.ts` — mutationId 幂等
- `src/lib/auth/password.test.ts` — 密码哈希
- `src/lib/reports/ai.test.ts` — AI fallback
- `src/lib/strategy/engine.test.ts` — VDOT 引擎（Phase 4 新增）

---

## 10. 后续可能方向

- 力量训练模板可配置化（当前硬编码）
- AI 评语接入真实 LLM（需配置 AI_API_KEY）
- 训练计划导出 PDF / iCal
- 跑步路线记录集成
- 多语言支持（当前全中文）
- 移动端 PWA

---

## 11. 联系与访问

- **GitHub 仓库**：https://github.com/z17code/StrideOS
- **线上地址**：见 Vercel 项目仪表盘
- **Supabase 旧库**（已弃用，DNS 不稳定）：项目 `pigvemqefbwpacrosbgj`
- **Neon 生产库**：见 Vercel 环境变量 `DATABASE_URL`
- **本地 Navicat**：`localhost:5432` / 用户 `postgres` / 库 `strideos`

---

*最后更新：2026-07-13 — Phase 4 完成，Vercel 已部署*
