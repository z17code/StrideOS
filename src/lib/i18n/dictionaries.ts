export type Locale = "zh-CN" | "en";

export const DEFAULT_LOCALE: Locale = "zh-CN";
export const LOCALE_COOKIE = "strideos_locale";

const zh = {
  nav: {
    today: "今日",
    plan: "计划",
    activity: "记录",
    insights: "洞察",
    tools: "工具",
    me: "我的",
  },
  common: {
    language: "语言",
    chinese: "中文",
    english: "English",
    saved: "已保存",
  },
  me: {
    title: "我的",
    subtitle: "账号与偏好设置",
    account: "账号信息",
    accountHint: "首版不支持自助修改密码，请联系管理员重置",
    username: "用户名",
    weeklyDistance: "近 6 周跑量",
    redoOnboarding: "重新填写入门信息",
    preferences: "偏好",
    preferencesHint: "界面语言偏好会保存在本机 Cookie",
  },
} as const;

const en = {
  nav: {
    today: "Today",
    plan: "Plan",
    activity: "Activity",
    insights: "Insights",
    tools: "Tools",
    me: "Me",
  },
  common: {
    language: "Language",
    chinese: "中文",
    english: "English",
    saved: "Saved",
  },
  me: {
    title: "Me",
    subtitle: "Account and preferences",
    account: "Account",
    accountHint: "Password self-service is not available yet; contact an admin to reset",
    username: "Username",
    weeklyDistance: "Last 6 weeks mileage",
    redoOnboarding: "Redo onboarding",
    preferences: "Preferences",
    preferencesHint: "Language preference is stored in a browser cookie",
  },
} as const;

export type Dictionary = typeof zh;

const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zh,
  en,
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh-CN" || value === "en";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
