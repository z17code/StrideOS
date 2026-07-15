import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { LogoutButton } from "@/components/layout/logout-button";
import { DeleteAccountSection } from "@/components/layout/delete-account-section";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getRequestDictionary } from "@/lib/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ANDROID_APK_HREF = "/downloads/strideos-android.apk";

export default async function MePage() {
  const { user, profile } = await requireOnboardedUser();
  const { locale, t } = await getRequestDictionary();

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">{t.me.title}</h1>
        <p className="page-subtitle">{t.me.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.me.account}</CardTitle>
          <CardDescription>{t.me.accountHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.me.username}</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.me.weeklyDistance}</span>
            <span className="font-medium tabular-nums">
              {profile.weeklyDistance ?? "—"} km
            </span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/onboarding"
              className="text-sm underline-offset-4 hover:underline"
            >
              {t.me.redoOnboarding}
            </Link>
          </div>
          <LogoutButton className="w-full sm:w-auto" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.me.preferences}</CardTitle>
          <CardDescription>{t.me.preferencesHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <LocaleSwitcher
            initialLocale={locale}
            labels={{
              language: t.common.language,
              chinese: t.common.chinese,
              english: t.common.english,
              saved: t.common.saved,
            }}
          />
          <ThemeSwitcher
            labels={{
              appearance: t.me.appearance,
              system: t.me.themeSystem,
              light: t.me.themeLight,
              dark: t.me.themeDark,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.me.appDownload}</CardTitle>
          <CardDescription>{t.me.appDownloadHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href={ANDROID_APK_HREF}
            download="strideos-android.apk"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm touch-manipulation active:opacity-80 sm:w-auto"
          >
            {t.me.downloadAndroidApk}
          </a>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t.me.appDownloadNote}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.me.help}</CardTitle>
          <CardDescription>{t.me.helpHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t.me.wechat}</span>
            <span className="font-medium select-all">z17code</span>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountSection
        labels={{
          title: t.me.deleteAccount,
          hint: t.me.deleteAccountHint,
          warning: t.me.deleteAccountWarning,
          confirmLabel: t.me.deleteAccountConfirmLabel,
          confirmPlaceholder: t.me.deleteAccountConfirmPlaceholder,
          openButton: t.me.deleteAccountOpen,
          cancelButton: t.me.deleteAccountCancel,
          submitButton: t.me.deleteAccountSubmit,
          submitting: t.me.deleteAccountSubmitting,
          mismatch: t.me.deleteAccountMismatch,
        }}
      />
    </div>
  );
}
