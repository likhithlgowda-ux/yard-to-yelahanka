"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ensureSignedIn, getStoredNickname, setNickname, subscribeAuth } from "@/src/lib/firebase/auth";

type Props = {
  children: ReactNode;
};

function makeDefaultNickname() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `Player${n}`;
}

export default function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth((u) => setUser(u));

    (async () => {
      try {
        const u = await ensureSignedIn(); // anonymous auth [web:123]

        const stored = getStoredNickname();
        const current = (u.displayName || "").trim();

        // If no displayName, set one automatically using updateProfile via setNickname. [web:198]
        if (!current) {
          const next = (stored && stored.trim()) ? stored.trim() : makeDefaultNickname();
          await setNickname(next);
        }
      } catch (e: any) {
        setBootError(e?.message ?? "Auth error");
      }
    })();

    return () => unsub();
  }, []);

  if (bootError) return <div className="p-6 text-red-600">Auth error: {bootError}</div>;
  if (!user) return <div className="p-6">Signing in…</div>;

  return <>{children}</>;
}
