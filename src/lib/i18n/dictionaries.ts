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
    accountHint: "暂不支持自助修改密码，请联系管理员重置",
    username: "用户名",
    weeklyDistance: "近 6 周跑量",
    redoOnboarding: "重新填写入门信息",
    preferences: "偏好",
    preferencesHint: "语言、外观与主题色仅对本设备生效",
    appearance: "外观",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    accent: "主题色",
    accentHint: "按钮、导航高亮与强调色",
    help: "帮助与反馈",
    helpHint: "使用问题或建议可添加微信联系",
    wechat: "微信号",
    appDownload: "安装 Android 应用",
    appDownloadHint: "下载安装包，在手机上安装后打开使用",
    downloadAndroidApk: "下载 Android 安装包",
    appDownloadNote:
      "安装时需允许「未知来源」。安装后需联网使用；当前为内测版本，非应用商店正式版。",
    deleteAccount: "注销账号",
    deleteAccountHint: "永久删除账号与全部训练数据，不可恢复",
    deleteAccountWarning:
      "注销后，你的计划、打卡、训练记录、跑鞋、力量课、比赛策略与会话登录状态将被永久删除，且无法恢复。若仅需暂时离开，请使用「退出登录」。",
    deleteAccountConfirmLabel: "请输入以下确认文案以继续",
    deleteAccountConfirmPlaceholder: "确认注销并永久删除全部数据",
    deleteAccountOpen: "注销账号…",
    deleteAccountCancel: "取消",
    deleteAccountSubmit: "确认永久注销",
    deleteAccountSubmitting: "正在注销…",
    deleteAccountMismatch: "确认文案不一致，请完整输入后再试",
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
    accountHint:
      "Password self-service is not available yet; contact an admin to reset",
    username: "Username",
    weeklyDistance: "Last 6 weeks mileage",
    redoOnboarding: "Redo onboarding",
    preferences: "Preferences",
    preferencesHint:
      "Language, appearance, and accent apply on this device",
    appearance: "Appearance",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    accent: "Accent color",
    accentHint: "Buttons, nav highlight, and emphasis",
    help: "Help & feedback",
    helpHint: "Add WeChat for questions or suggestions",
    wechat: "WeChat",
    appDownload: "Install Android app",
    appDownloadHint: "Download the install package for your phone",
    downloadAndroidApk: "Download Android install package",
    appDownloadNote:
      "Allow installs from unknown sources. The app loads the live site and needs network access. Internal testing only — not a store release.",
    deleteAccount: "Delete account",
    deleteAccountHint:
      "Permanently delete your account and all training data. This cannot be undone.",
    deleteAccountWarning:
      "Deleting your account permanently removes plans, check-ins, activities, shoes, strength sessions, race strategies, and login sessions. If you only want to leave for now, use Sign out instead.",
    deleteAccountConfirmLabel: "Type the confirmation phrase to continue",
    deleteAccountConfirmPlaceholder: "确认注销并永久删除全部数据",
    deleteAccountOpen: "Delete account…",
    deleteAccountCancel: "Cancel",
    deleteAccountSubmit: "Permanently delete",
    deleteAccountSubmitting: "Deleting…",
    deleteAccountMismatch: "Confirmation text does not match. Please type it exactly.",
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
