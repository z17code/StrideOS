/** Confirmation phrases for permanent account deletion (safe for client + server). */

/** Self-serve delete: must type this exact phrase (long to reduce mis-taps). */
export const DELETE_ACCOUNT_CONFIRMATION = "确认注销并永久删除全部数据";

/** Admin delete: slightly different phrase so admin paste mistakes are less likely. */
export const ADMIN_DELETE_USER_CONFIRMATION = "确认注销该用户并永久删除全部数据";
