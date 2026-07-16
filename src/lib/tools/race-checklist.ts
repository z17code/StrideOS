/**
 * Race countdown checklists (static, client-safe). No DB.
 */

export type CountdownPhase =
  | "t_minus_4w"
  | "t_minus_2w"
  | "t_minus_1w"
  | "t_minus_3d"
  | "race_eve"
  | "race_morning";

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface CountdownSection {
  phase: CountdownPhase;
  title: string;
  subtitle: string;
  items: ChecklistItem[];
}

export const RACE_COUNTDOWN: CountdownSection[] = [
  {
    phase: "t_minus_4w",
    title: "赛前 4 周",
    subtitle: "巩固课表，确认后勤",
    items: [
      { id: "4w-1", text: "确认比赛报名、号码布领取方式与交通" },
      { id: "4w-2", text: "选定比赛主鞋与备用鞋，避免全新鞋首发" },
      { id: "4w-3", text: "在长跑中演练补给（胶/水/盐）" },
      { id: "4w-4", text: "若有伤痛，优先就医/减量，勿硬扛" },
    ],
  },
  {
    phase: "t_minus_2w",
    title: "赛前 2 周",
    subtitle: "进入减量思路",
    items: [
      { id: "2w-1", text: "质量课缩短，保留一点速度感即可" },
      { id: "2w-2", text: "睡眠优先，少熬夜" },
      { id: "2w-3", text: "检查手表、心率带、腰带、防磨装备" },
      { id: "2w-4", text: "粗定分段策略（可到「分段配速表」工具）" },
    ],
  },
  {
    phase: "t_minus_1w",
    title: "赛前 1 周",
    subtitle: "减量 + 碳水铺垫",
    items: [
      { id: "1w-1", text: "跑量明显下降，避免新的大强度实验" },
      { id: "1w-2", text: "饮食偏熟悉、好消化，逐步提高碳水比例" },
      { id: "1w-3", text: "确认起终点、存包、厕所与陪同计划" },
      { id: "1w-4", text: "打印/截图分段表，设定手表提醒" },
    ],
  },
  {
    phase: "t_minus_3d",
    title: "赛前 3 天",
    subtitle: "腿要新鲜",
    items: [
      { id: "3d-1", text: "只做短轻松跑或休息" },
      { id: "3d-2", text: "多补液，少酒精与重油辣" },
      { id: "3d-3", text: "整理赛包：号码布、芯片、鞋服、补给、证件" },
      { id: "3d-4", text: "关注天气，准备薄外套或防晒" },
    ],
  },
  {
    phase: "race_eve",
    title: "赛前夜",
    subtitle: "早睡比多吃更重要",
    items: [
      { id: "eve-1", text: "晚餐适量，避免尝试从没吃过的东西" },
      { id: "eve-2", text: "铺好衣服与装备，设置双闹钟" },
      { id: "eve-3", text: "手表充满电，确认赛道模式与配速页" },
      { id: "eve-4", text: "接受紧张感，想象开跑后前 3 公里很轻松" },
    ],
  },
  {
    phase: "race_morning",
    title: "比赛当天",
    subtitle: "流程简单可执行",
    items: [
      { id: "am-1", text: "早起，熟悉的早餐，赛前 1–2 小时吃完" },
      { id: "am-2", text: "提前到场，热身 + 厕所，不慌不赶" },
      { id: "am-3", text: "前三分之一克制配速，按计划补给" },
      { id: "am-4", text: "后程再取，遇不适及时降速或求助" },
    ],
  },
];
