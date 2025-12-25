"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MapPackId, RoomDoc, RoomVisibility } from "@/src/game/rooms/schema";
import { createRoom, resolveRoomIdByCode, subscribePublicRooms } from "@/src/game/rooms/roomsClient";
import { setNickname, subscribeAuth, getStoredNickname } from "@/src/lib/firebase/auth";
import { firebaseAuth } from "@/src/lib/firebase/client";

function normalizeInputCode(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function pickBestNickname(): string {
  const fromAuth = firebaseAuth.currentUser?.displayName;
  const fromStorage = getStoredNickname();
  return (fromAuth || fromStorage || "Player").trim() || "Player";
}

export default function HomePage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string>("Player");

  const [showNickEditor, setShowNickEditor] = useState(false);
  const showNickEditorRef = useRef(false);

  const [nickInput, setNickInput] = useState<string>("Player");
  const [nickSaving, setNickSaving] = useState(false);
  const [nickError, setNickError] = useState<string | null>(null);

  // Create room settings
  const [visibility, setVisibility] = useState<RoomVisibility>("private");
  const [creating, setCreating] = useState(false);
  const [showCreateSettings, setShowCreateSettings] = useState(false);

  const [mapPackId, setMapPackId] = useState<MapPackId>("london-classic");
  const [mrXBlackTickets, setMrXBlackTickets] = useState<number>(5);
  const [mrXDoubleTickets, setMrXDoubleTickets] = useState<number>(2);

  // Join room
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Public rooms
  const [publicRooms, setPublicRooms] = useState<RoomDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showNickEditorRef.current = showNickEditor;
  }, [showNickEditor]);

  useEffect(() => {
    setHydrated(true);

    const initial = pickBestNickname();
    setUserDisplayName(initial);
    setNickInput(initial);

    const unsub = subscribeAuth((u) => {
      const next = (u?.displayName || getStoredNickname() || "Player").trim() || "Player";
      setUserDisplayName(next);
      if (!showNickEditorRef.current) setNickInput(next);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribePublicRooms(setPublicRooms, { limit: 12 });
    return () => unsub();
  }, []);

  const canJoin = useMemo(() => normalizeInputCode(code).length === 6, [code]);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px circle at 20% 10%, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0) 55%), radial-gradient(900px circle at 85% 20%, rgba(14,165,233,0.08) 0%, rgba(14,165,233,0) 55%), linear-gradient(180deg, #070A12 0%, #050812 100%)",
        }}
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm tracking-wide text-white/60">Scotland Yard online</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">yard-to-yelahanka</h1>
          </div>

          <Link href="/board" className="text-sm text-white/70 hover:text-white transition-colors">
            Board preview
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs text-white/60">Signed in as</div>
              <div className="mt-1 text-lg font-semibold" suppressHydrationWarning>
                {hydrated ? userDisplayName : "Player"}
              </div>
            </div>

            {!showNickEditor ? (
              <button
                type="button"
                onClick={() => {
                  setNickError(null);
                  setNickInput(userDisplayName);
                  setShowNickEditor(true);
                }}
                className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5 active:scale-[0.99]"
              >
                Change nickname
              </button>
            ) : (
              <form
                className="w-full sm:w-auto"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setNickError(null);

                  const trimmed = nickInput.trim();
                  if (trimmed.length < 2) return setNickError("Nickname must be at least 2 characters.");
                  if (trimmed.length > 18) return setNickError("Nickname must be 18 characters or fewer.");

                  setNickSaving(true);
                  try {
                    await setNickname(trimmed); // updateProfile(displayName) [web:198]
                    setUserDisplayName(trimmed);
                    setNickInput(trimmed);
                    setShowNickEditor(false);
                  } catch (err: any) {
                    setNickError(err?.message ?? "Failed to update nickname.");
                  } finally {
                    setNickSaving(false);
                  }
                }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={nickInput}
                    onChange={(e) => setNickInput(e.target.value)}
                    className="w-full sm:w-64 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
                    placeholder="New nickname"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNickError(null);
                        setShowNickEditor(false);
                      }}
                      className="w-full sm:w-auto rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5 active:scale-[0.99]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={nickSaving}
                      className="w-full sm:w-auto rounded-xl bg-white text-black px-3 py-2 text-sm font-medium transition hover:bg-white/90 active:scale-[0.99] disabled:opacity-60"
                    >
                      {nickSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>

                {nickError ? <div className="mt-2 text-sm text-red-300">{nickError}</div> : null}
              </form>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-lg font-semibold">Create room</div>
            <p className="mt-1 text-sm text-white/60">Host a new game.</p>

            <div className="mt-4">
              <div className="text-xs text-white/60">Visibility</div>
              <div className="mt-2 inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    visibility === "private"
                      ? "bg-white/10 text-white"
                      : "text-white/65 hover:text-white"
                  }`}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    visibility === "public"
                      ? "bg-white/10 text-white"
                      : "text-white/65 hover:text-white"
                  }`}
                >
                  Public
                </button>
              </div>
            </div>

            {!showCreateSettings ? (
              <button
                type="button"
                disabled={creating}
                onClick={() => {
                  setError(null);
                  setShowCreateSettings(true);
                }}
                className="mt-5 w-full rounded-xl bg-white text-black px-3 py-2 text-sm font-medium transition hover:bg-white/90 active:scale-[0.99] disabled:opacity-60"
              >
                {creating ? "Creating…" : "Continue"}
              </button>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-white/60">Map</div>
                  <select
                    value={mapPackId}
                    onChange={(e) => setMapPackId(e.target.value as MapPackId)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  >
                    <option value="london-classic">London Classic</option>
                    <option value="namma-bengaluru" disabled>
                      Namma Bengaluru (Coming soon)
                    </option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-xs text-white/60">Mr. X special tickets</div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <div className="text-xs text-white/60">Black</div>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={mrXBlackTickets}
                        onChange={(e) => setMrXBlackTickets(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs text-white/60">Double</div>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={mrXDoubleTickets}
                        onChange={(e) => setMrXDoubleTickets(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                      />
                    </label>
                  </div>

                  <div className="mt-2 text-[11px] text-white/45">Defaults: Black 5, Double 2.</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => setShowCreateSettings(false)}
                    className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5 active:scale-[0.99] disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={creating}
                    onClick={async () => {
                      setError(null);
                      setCreating(true);
                      try {
                        const room = await createRoom({
                          visibility,
                          mapPackId,
                          mrXBlackTickets,
                          mrXDoubleTickets,
                        });
                        router.push(`/room/${room.id}`);
                      } catch (e: any) {
                        setError(e?.message ?? "Failed to create room.");
                      } finally {
                        setCreating(false);
                      }
                    }}
                    className="w-full rounded-xl bg-white text-black px-3 py-2 text-sm font-medium transition hover:bg-white/90 active:scale-[0.99] disabled:opacity-60"
                  >
                    {creating ? "Creating…" : "Create room"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-lg font-semibold">Join room</div>
            <p className="mt-1 text-sm text-white/60">Enter a 6‑character code.</p>

            <label className="mt-4 block">
              <div className="text-xs text-white/60">Room code</div>
              <input
                value={code}
                onChange={(e) => setCode(normalizeInputCode(e.target.value))}
                placeholder="ABC123"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
              />
            </label>

            <button
              type="button"
              disabled={joining || !canJoin}
              onClick={async () => {
                setError(null);
                setJoining(true);
                try {
                  const roomId = await resolveRoomIdByCode(code);
                  if (!roomId) {
                    setError("Room not found. Check the code.");
                    return;
                  }
                  router.push(`/room/${roomId}`);
                } catch (e: any) {
                  setError(e?.message ?? "Failed to join room.");
                } finally {
                  setJoining(false);
                }
              }}
              className="mt-5 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5 active:scale-[0.99] disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Public rooms</div>
              <div className="text-xs text-white/50">Live</div>
            </div>
            <p className="mt-1 text-sm text-white/60">Jump into a listed room.</p>

            <div className="mt-4 space-y-2">
              {publicRooms.length === 0 ? (
                <div className="text-sm text-white/50">No public rooms right now.</div>
              ) : (
                publicRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => router.push(`/room/${r.id}`)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left text-sm transition hover:bg-black/30 hover:border-white/20 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium tracking-widest">{r.code}</div>
                      <div className="text-xs text-white/50">{r.visibility}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        {error ? <div className="mt-4 text-sm text-red-300">{error}</div> : null}

        <div className="mt-10 text-xs text-white/45">Tip: Private rooms can still be joined by code.</div>
      </div>
    </main>
  );
}
