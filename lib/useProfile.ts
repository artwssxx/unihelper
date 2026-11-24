"use client";

import { useMemo } from "react";
import { useStore } from "./clientStore";
import { withMocks } from "./mocks/profileLink";
import type { Profile } from "./types";

/** Профиль ученика с учётом хард-моков; undefined — ещё не загружено, null — анкета не пройдена. */
export function useProfile(): { profile: Profile | null | undefined; store: ReturnType<typeof useStore> } {
  const store = useStore();
  const profile = useMemo(() => {
    if (!store) return undefined;
    if (!store.profile) return null;
    return withMocks(store.profile, store.mocks ?? []);
  }, [store]);
  return { profile, store };
}
