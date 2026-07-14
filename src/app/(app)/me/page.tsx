import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { LogoutButton } from "@/components/layout/logout-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getRequestDictionary } from "@/lib/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const { user, profile } = await requireOnboardedUser();
  const { locale, t } = await getRequestDictionary();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t.me.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.me.subtitle}</p>
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
        <CardContent>
          <LocaleSwitcher
            initialLocale={locale}
            labels={{
              language: t.common.language,
              chinese: t.common.chinese,
              english: t.common.english,
              saved: t.common.saved,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
