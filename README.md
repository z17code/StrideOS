# StrideOS

面向大众进阶跑者的智能训练驾驶舱（邀请制 MVP）。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS + Radix UI + Lucide
- Drizzle ORM + PostgreSQL（Supabase）
- 自定义认证（scrypt + HttpOnly Cookie）
- Vitest

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

- `DATABASE_URL`：PostgreSQL 连接串（本地或 Supabase）
- `SESSION_SECRET`：≥32 字符随机串
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`：种子管理员账号

### 3. 数据库

```bash
# 生成迁移 SQL（schema 变更后）
npm run db:generate

# 应用迁移
npm run db:migrate

# 或开发期直接 push schema
npm run db:push

# 创建管理员
npm run db:seed
```

### 4. 启动

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

- 普通用户：`/login` → `/today`
- 管理员：登录后进入 `/admin`，可生成邀请码

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm test` | 单元测试 |
| `npm run db:generate` | 生成 Drizzle 迁移 |
| `npm run db:migrate` | 执行迁移 |
| `npm run db:push` | 直接 push schema |
| `npm run db:seed` | 种子管理员 |

## Phase 进度

### Phase 1
- [x] 项目骨架与黑白应用壳
- [x] Drizzle schema（全量核心表）
- [x] 邀请码注册 / 登录 / 登出 / 重置令牌
- [x] 管理员：用户启停、邀请码、重置令牌
- [x] 响应式导航（移动端底栏 / 桌面侧栏）

### Phase 2
- [x] 入门问卷（Onboarding）与档案
- [x] 比赛目标 CRUD（单活跃目标）
- [x] 确定性 PlanEngine（8–24 周，阶段/递进/减量/间隔/长跑上限）
- [x] 计划版本持久化与生成 API
- [x] 响应式周历 + 课表明细 + 版本历史
- [x] Vitest 单元测试 + fast-check 属性测试

### Phase 3
- [x] 打卡表单（疲劳 1–5 / 疼痛 0–10 滑动）+ 今日训练列表
- [x] 训练记录 CRUD（距离 / 时长 / RPE / 心率 / 疼痛 / 备注 / 幂等 ID）
- [x] 智能调课引擎（5 条规则）+ 确认 / 忽略 / 撤销流程
- [x] 周报 / 月报 / 趋势报告 + AI 评语（8s 超时 + 模板兜底）
- [x] 三页 UI 全部落地（today / activity / insights）
- [x] 引擎边界测试 + AI fallback 测试 + mutationId 幂等测试（80 tests pass）

### Phase 4（进行中）
- [ ] VDOT 引擎（ Daniels 公式 + 等价成绩 + 训练配速区间 + 负分割策略 ）
- [ ] 比赛策略 API（计算 + 保存 + 列表 + 删除）
- [ ] 跑鞋管理 CRUD + API（里程自动累加）
- [ ] 力量训练记录 CRUD + API
- [ ] /tools 页落地（跑鞋 / 力量 / 比赛策略三个入口）
- [ ] Phase 4 测试 + 文档更新

## 关键训练 API

| 方法 | 路径 |
|------|------|
| GET  | `/api/v1/onboarding/status` |
| POST | `/api/v1/onboarding/complete` |
| GET/PUT | `/api/v1/me/profile` |
| GET/POST | `/api/v1/goals` |
| PUT/DELETE | `/api/v1/goals/:id` |
| GET  | `/api/v1/plans` |
| GET  | `/api/v1/plans/current` |
| POST | `/api/v1/plans/generate` |
| GET  | `/api/v1/plans/:versionId` |
| GET/POST | `/api/v1/activities` |
| GET/PUT/DELETE | `/api/v1/activities/:id` |
| GET/POST | `/api/v1/check-ins` |
| GET/POST | `/api/v1/reports/weekly` |
| GET/POST | `/api/v1/reports/monthly` |
| GET/POST | `/api/v1/reports/trends` |
