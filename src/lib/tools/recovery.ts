/**
 * Warm-up / cool-down / stretch checklists (static content, client-safe).
 * Stored in repo — no DB.
 */

export type RecoveryKind = "warmup" | "cooldown" | "stretch";

export interface RecoveryItem {
  id: string;
  title: string;
  detail: string;
  durationSec?: number;
}

export interface RecoveryRoutine {
  kind: RecoveryKind;
  title: string;
  subtitle: string;
  items: RecoveryItem[];
}

export const RECOVERY_ROUTINES: RecoveryRoutine[] = [
  {
    kind: "warmup",
    title: "课前热身",
    subtitle: "约 10–15 分钟，激活关节与心率",
    items: [
      {
        id: "wu-1",
        title: "轻松慢跑",
        detail: "很轻松的配速，边跑边活动肩颈",
        durationSec: 5 * 60,
      },
      {
        id: "wu-2",
        title: "动态拉伸",
        detail: "高抬腿、后踢腿、开合步、弓步转体各 20–30 秒",
        durationSec: 3 * 60,
      },
      {
        id: "wu-3",
        title: "跑姿激活",
        detail: "小步跑、高抬腿跑、侧向交叉步",
        durationSec: 2 * 60,
      },
      {
        id: "wu-4",
        title: "步幅加速",
        detail: "2–4 次 80–100m 渐进加速，充分恢复",
        durationSec: 3 * 60,
      },
    ],
  },
  {
    kind: "cooldown",
    title: "课后放松",
    subtitle: "约 5–10 分钟，帮助心率回落",
    items: [
      {
        id: "cd-1",
        title: "放松慢跑 / 快走",
        detail: "比主课轻松很多，不要突然停下",
        durationSec: 5 * 60,
      },
      {
        id: "cd-2",
        title: "呼吸调整",
        detail: "鼻吸口呼，肩膀放松，走 1–2 分钟",
        durationSec: 2 * 60,
      },
      {
        id: "cd-3",
        title: "补水",
        detail: "小口补水，热天可加电解质",
      },
    ],
  },
  {
    kind: "stretch",
    title: "拉伸清单",
    subtitle: "静态拉伸，每侧 20–40 秒，不弹震",
    items: [
      {
        id: "st-1",
        title: "小腿 / 跟腱",
        detail: "弓步压墙或台阶拉伸，膝微屈与伸直各做",
        durationSec: 40,
      },
      {
        id: "st-2",
        title: "股四头肌",
        detail: "单脚站立抓脚背，骨盆中立",
        durationSec: 40,
      },
      {
        id: "st-3",
        title: "腘绳肌",
        detail: "单腿前伸、髋后移，避免弯腰弓背",
        durationSec: 40,
      },
      {
        id: "st-4",
        title: "髋屈肌 / 髂腰肌",
        detail: "跪姿弓步，后侧髋向前轻推",
        durationSec: 40,
      },
      {
        id: "st-5",
        title: "臀肌 / 梨状肌",
        detail: "仰卧数字 4 或坐姿交叉腿前倾",
        durationSec: 40,
      },
      {
        id: "st-6",
        title: "胸椎 / 肩",
        detail: "开胸拉伸、猫牛式轻柔活动",
        durationSec: 40,
      },
    ],
  },
];

export function getRoutine(kind: RecoveryKind): RecoveryRoutine {
  const found = RECOVERY_ROUTINES.find((r) => r.kind === kind);
  if (!found) throw new Error("未知清单类型");
  return found;
}
