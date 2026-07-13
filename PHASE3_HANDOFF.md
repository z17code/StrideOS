# Phase 4 交接（2026-07-13）

## 已完成

### VDOT 引擎（纯函数，未 commit）
- `src/lib/strategy/engine.ts` — Daniels-Gilbert 公式实现
  - `computeVdot(distanceKm, timeSec)` — VO2 = -4.6 + 0.182252·v + 0.000104·v²，v = m/min
  - `vdotToTrainingPaces(vdot)` — 五档区间（easy/marathon/threshold/interval/repetition）
  - `equivalentRaceTimes(vdot)` — 二分法求等价成绩
  - `negativeSplitStrategy(distanceType, targetTimeSec)` — 半马3段/全马4段/10k2段，末段吸收舍入余量保证 `sum duration === targetTimeSec`
  - `buildRaceStrategy(...)` — 汇总为 RaceStrategy 对象

## 待完成

### 策略功能
- `src/lib/strategy/engine.test.ts` — VDOT 单调性、数值区间、配速单调、等价时间往返、负分割总和
- `src/db/schema.ts` 末尾追加 `raceStrategies` 表
- `drizzle/0002_phase4_strategy.sql` + 更新 `_journal.json`
- `src/lib/strategy/service.ts` — computeStrategy / create / list / get / delete
- `src/lib/validators/strategy.ts` — computeStrategySchema（distanceType + targetTimeSec）
- `src/app/api/v1/strategies/route.ts` + `[id]/route.ts` — GET/POST list、POST compute+save、DELETE

### 跑鞋管理
- `src/lib/shoes/service.ts` — 从 activities 迁出 mapShoe/getShoes，新增 create/update/delete/listActive/listAll
- `src/lib/validators/shoe.ts` — createShoeSchema / updateShoeSchema
- `src/app/api/v1/shoes/route.ts` + `[id]/route.ts` — GET/POST/PUT/DELETE

### 力量训练
- `src/lib/strength/service.ts` — STRENGTH_TEMPLATES + CRUD
- `src/lib/validators/strength.ts` + `src/app/api/v1/strength/route.ts` + `[id]/route.ts` — templateId enum: core/hips/calves/balance/mobility

### Tools 页面
- `src/app/(app)/tools/page.tsx` — hub 改造（三卡片链接）
- `src/app/(app)/tools/shoes/page.tsx` — 跑鞋列表 + 新建 + 退役
- `src/app/(app)/tools/strength/page.tsx` — 力量记录列表 + 新建
- `src/app/(app)/tools/race/page.tsx` — VDOT 计算器 + 负分割展示 + 保存策略

### 文档
- README.md 补 Phase 3 + Phase 4 checklist + API 表
- 删除本交接文档（PHASE3_HANDOFF.md），功能已合并到 Phase 3 UI + 测试

## 下一步
1. 引擎写测试 → commit
2. 实现 schema + 迁移
3. 实现 service + validator + route（shoes / strength / strategies）
4. 实现 tools 三页面
5. `npm run typecheck && npm test && npm run build`
6. 配 `DATABASE_URL` 后 `npm run db:push`

## 环境变量
```
DATABASE_URL=...
SESSION_SECRET=...
AI_BASE_URL=      # 可选
AI_API_KEY=       # 可选
AI_MODEL=         # 可选，默认 gpt-4o-mini
```
