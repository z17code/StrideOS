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
    preferencesHint: "语言与外观偏好会保存在本机",
    appearance: "外观",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    help: "帮助与反馈",
    helpHint: "使用问题或建议可添加微信联系",
    wechat: "微信号",
    appDownload: "安装 Android 应用",
    appDownloadHint: "下载 APK 安装包，在手机上打开使用（WebView 壳）",
    downloadAndroidApk: "下载 Android APK",
    appDownloadNote: "安装时需允许「未知来源」。应用打开后访问线上站点，需联网；仅供内测，非正式应用商店版本。",
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
    preferencesHint: "Language and appearance preferences are stored on this device",
    appearance: "Appearance",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    help: "Help & feedback",
    helpHint: "Add WeChat for questions or suggestions",
    wechat: "WeChat",
    appDownload: "Install Android app",
    appDownloadHint: "Download the APK to install on your phone (WebView shell)",
    downloadAndroidApk: "Download Android APK",
    appDownloadNote: "Allow installs from unknown sources. The app loads the live site and needs network access. Internal testing only — not a store release.",
  },
} as const;

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Dictionary = DeepStringify<typeof zh>;

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

