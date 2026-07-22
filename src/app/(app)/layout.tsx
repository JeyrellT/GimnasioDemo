import type { ReactNode } from "react";
import { ClientLayout } from "./_client-layout";
import { ImpersonationBanner } from "./admin/_components/impersonation-banner";
import { getCurrentUser } from "@/server/guards";
import {
  getAdminMirrorDirectory,
  getCurrentImpersonation,
  type AdminMirrorAccount,
} from "@/server/actions/admin.actions";
import type {
  MirrorViewSwitcherState,
  MirrorViewTarget,
} from "./admin/_components/mirror-view-switcher";

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es");
}

function preferredAccount(
  accounts: AdminMirrorAccount[],
  preferredNames: string[],
): AdminMirrorAccount | null {
  const available = accounts.filter((account) => !account.suspended);
  return (
    available.find((account) => {
      const name = normalizeName(account.name);
      return preferredNames.some((preferred) => name.includes(preferred));
    }) ??
    available[0] ??
    null
  );
}

function quickTarget(account: AdminMirrorAccount | null) {
  if (!account) return null;
  return { id: account.id, email: account.email, name: account.name };
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [currentUser, impersonationResult] = await Promise.all([
    getCurrentUser(),
    getCurrentImpersonation(),
  ]);
  const impersonation = impersonationResult.ok
    ? impersonationResult.value
    : null;
  const effectiveUser = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
      }
    : undefined;

  const hasMirrorAccess =
    currentUser?.role === "SUPER_ADMIN" ||
    Boolean(impersonation?.isImpersonating && impersonation.actor);
  let mirrorSwitcher: MirrorViewSwitcherState | undefined;

  if (hasMirrorAccess) {
    const directoryResult = await getAdminMirrorDirectory();
    const directory = directoryResult.ok ? directoryResult.value : null;
    const coach = preferredAccount(directory?.trainers ?? [], ["jorge"]);
    const client = preferredAccount(directory?.clients ?? [], [
      "geovanni",
      "geovanny",
      "geovany",
    ]);
    const target = impersonation?.isImpersonating
      ? impersonation.target
      : undefined;
    const activeTarget: MirrorViewTarget | null =
      target && target.role !== "SUPER_ADMIN"
        ? {
            id: target.id,
            email: target.email,
            name: target.name,
            role: target.role,
          }
        : null;

    mirrorSwitcher = {
      activeTarget,
      coach: quickTarget(coach),
      client: quickTarget(client),
    };
  }

  return (
    <>
      <ImpersonationBanner impersonation={impersonation} />
      <ClientLayout
        effectiveUser={effectiveUser}
        mirrorSwitcher={mirrorSwitcher}
      >
        {children}
      </ClientLayout>
    </>
  );
}
