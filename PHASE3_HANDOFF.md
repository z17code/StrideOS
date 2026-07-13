# Phase 3 交接（2026-07-13）

## 已完成

### Validators
- `src/lib/validators/checkin.ts` — fatigue 1–5, pain 0–10
- `src/lib/validators/activity.ts` — create/update + `mutationId`
- `src/lib/validators/adjustment.ts` — propose/confirm/reject
- `src/lib/validators/report.ts` — weekly/monthly query + Report 类型

### Service 层
| 文件 | 功能 |
|------|------|
| `src/lib/checkins/service.ts` | get/upsert/listRecent + mapCheckin |
| `src/lib/activities/service.ts` | CRUD + mutationId 幂等 + getShoes + mapActivity |
| `src/lib/adjustments/engine.ts` | 纯函数 proposeAdjustments + applyProposalToWorkouts |
| `src/lib/adjustments/service.ts` | list/get/propose/confirm/reject/revert + mapProposal |
| `src/lib/reports/ai.ts` | isAiConfigured + generateAiSummary (8s 超时) |
| `src/lib/reports/service.ts` | buildWeekly/Monthly/TrendReport + template 兜底 |

### API 路由（11 条，全部 `requireUser` + Zod safeParse）
```
GET/POST        /api/v1/check-ins
GET/POST        /api/v1/activities
GET/PUT/DELETE  /api/v1/activities/[id]
GET             /api/v1/adjustments
POST            /api/v1/adjustments/propose
PUT             /api/v1/adjustments/[id]/confirm
PUT             /api/v1/adjustments/[id]/reject
POST            /api/v1/adjustments/[id]/revert
GET             /api/v1/reports/weekly
GET             /api/v1/reports/monthly
GET             /api/v1/reports/trends
```

### 调课规则（engine 已实现）
1. 漏课（近 7 天无 activity）→ easy 取消 / quality 尝试 move
2. RPE ≥ target+2 → reduce_intensity
3. 连续 ≥3 天 fatigue≥4 或 pain≥5 → reduce_load
4. 疼痛 ≥7 → cancel（critical）
5. 备注含「胸痛/晕厥…」→ medical_alert

### confirm/revert 约定
- propose 只写 `adjustment_proposals` pending，**不改课表**
- confirm 新建 `plan_versions`（inactive→active flip）
- revert 仅最近一次 confirmed：停用 to、重激活 from

## 待完成

### UI（页面仍是 Phase 3 占位文案）
- `src/app/(app)/today/page.tsx` — 打卡表单 + 待确认调课列表
- `src/app/(app)/activity/page.tsx` — 记录列表 + 新建表单
- `src/app/(app)/insights/page.tsx` — weekly/trends 报告展示

### Tests
- engine 边界单测（漏课/RPE/连续异常/疼痛/医疗词）
- mutationId 幂等集成测试
- AI fallback 测试（无 key → 模板）

### 建议修的 bug
1. engine `ActivityRecord` 已有 `notes`，service 已传入 `a.notes` — 确认 medical_alert 触发
2. `applyProposalToWorkouts` 返回 `cancelledIds` — confirm 已用，确认无 bug
3. 跑鞋里程已改为 `sql` 累加 + `shoes.userId` 校验
4. `listRecentCheckins` 已是降序
5. confirm 的 dayOfWeek 已用 `dayOfWeek()` from `@/lib/datetime`
6. 清理未用 import

## 下一步
1. `npm run typecheck && npm test && npm run build` 修编译错误
2. 实现三页 UI（参考 `generate-plan-button.tsx` 客户端模式）
3. 写测试
4. 配 `DATABASE_URL` 后 `npm run db:push`

## 环境变量
```
DATABASE_URL=...
SESSION_SECRET=...
AI_BASE_URL=      # 可选
AI_API_KEY=       # 可选
AI_MODEL=         # 可选，默认 gpt-4o-mini
```

## 约定
- 纯逻辑在 `src/lib`，路由薄
- 数据按 `auth.user.id` 隔离
- 计划版本：先插 inactive → 再 flip active
- AI **永不**改计划，只发结构化指标
- 黑白极简 UI + 移动端 `pb-24`
