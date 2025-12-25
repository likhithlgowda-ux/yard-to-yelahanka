"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { firebaseAuth } from "@/src/lib/firebase/client";
import { subscribeAuth, setNickname } from "@/src/lib/firebase/auth";
import type { RoomDoc, RoomPlayerDoc } from "@/src/game/rooms/schema";
import {
  joinRoomWithNickname,
  kickPlayer,
  leaveRoom,
  startGameWithRoles,
  subscribeRoom,
  subscribeRoomPlayers,
} from "@/src/game/rooms/roomsClient";

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function RoomLobbyPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(() => firebaseAuth.currentUser);

  const [joined, setJoined] = useState(false);
  const [needsRename, setNeedsRename] = useState(false);
  const [accessLost, setAccessLost] = useState(false);

  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [players, setPlayers] = useState<RoomPlayerDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [renameInput, setRenameInput] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  const [leaving, setLeaving] = useState(false);
  const [kickingUid, setKickingUid] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Prevent the initial join effect from re-running due to auth displayName updates during rename.
  const joinAttemptedRef = useRef(false);

  const myUid = user?.uid ?? firebaseAuth.currentUser?.uid ?? "";
  const myNickname = useMemo(() => {
    const u = user || firebaseAuth.currentUser;
    return (u?.displayName || "Player").trim() || "Player";
  }, [user]);

  const isHost = !!room && !!myUid && room.createdByUid === myUid;

  useEffect(() => {
    const unsub = subscribeAuth((u) => setUser(u));
    return () => unsub();
  }, []);

  // Attempt join once user is present.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);

      if (!user) return;
      if (joinAttemptedRef.current) return;

      joinAttemptedRef.current = true;

      setJoined(false);
      setNeedsRename(false);
      setAccessLost(false);

      const res = await joinRoomWithNickname(roomId, user.displayName || "Player");
      if (cancelled) return;

      if (res.ok) {
        setJoined(true);
        return;
      }

      if (res.reason === "nickname_taken") {
        setNeedsRename(true);
        setRenameInput((user.displayName || "").trim());
        return;
      }

      setError(res.message);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [roomId, user]);

  // Subscribe room doc after joined.
  useEffect(() => {
    if (!joined || accessLost) return;

    return subscribeRoom(
      roomId,
      (r) => {
        setRoom(r);

        // Redirect everyone once started
        if (r?.state === "started" && r.gameId) {
          router.replace(`/game/${r.gameId}`);
        }
      },
      (err) => {
        if (err?.code === "permission-denied") {
          setAccessLost(true);
          setError("You were removed from this room.");
          setTimeout(() => router.replace("/"), 900);
        }
      }
    );
  }, [roomId, joined, accessLost, router]);

  // Subscribe players after joined.
  useEffect(() => {
    if (!joined || accessLost) return;

    return subscribeRoomPlayers(
      roomId,
      setPlayers,
      (err) => {
        if (err?.code === "permission-denied") {
          setAccessLost(true);
          setError("You were removed from this room.");
          setTimeout(() => router.replace("/"), 900);
        }
      }
    );
  }, [roomId, joined, accessLost, router]);

  async function onLeave() {
    if (!myUid) return;

    setError(null);
    setLeaving(true);
    try {
      // If host, transfer to a random remaining player (best-effort)
      let transferTo: string | undefined = undefined;
      if (room?.createdByUid === myUid) {
        const candidates = players.filter((p) => p.uid !== myUid).map((p) => p.uid);
        transferTo = pickRandom(candidates);
      }

      await leaveRoom(roomId, transferTo);
      router.push("/");
    } catch (e: any) {
      setError(e?.message ?? "Failed to leave room.");
    } finally {
      setLeaving(false);
    }
  }

  async function onKick(targetUid: string) {
    setError(null);
    setKickingUid(targetUid);
    try {
      await kickPlayer(roomId, targetUid);
    } catch (e: any) {
      setError(e?.message ?? "Failed to kick player.");
    } finally {
      setKickingUid(null);
    }
  }

  async function onStart() {
    setError(null);
    setStarting(true);
    try {
      await startGameWithRoles(roomId, players);
      // Redirect happens through subscribeRoom when room.state changes.
    } catch (e: any) {
      setError(e?.message ?? "Failed to start game.");
    } finally {
      setStarting(false);
    }
  }

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
            <div className="text-sm tracking-wide text-white/60">Room lobby</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{room?.code ?? "Loading…"}</h1>
            <div className="mt-1 text-sm text-white/60">
              You: {myNickname} {isHost ? <span className="text-white/50">(host)</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLeave}
              disabled={!joined || leaving || accessLost}
              className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-50"
            >
              {leaving ? "Leaving…" : "Leave room"}
            </button>

            <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </div>

        {error ? <div className="mt-4 text-sm text-red-300">{error}</div> : null}

        {needsRename ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-lg font-semibold">Nickname already taken</div>
            <p className="mt-1 text-sm text-white/60">
              Someone in this room is already using that nickname. Pick a new one to join.
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);

                const trimmed = renameInput.trim();
                if (trimmed.length < 2) return setError("Nickname must be at least 2 characters.");
                if (trimmed.length > 18) return setError("Nickname must be 18 characters or fewer.");
                if (trimmed.includes("/")) return setError("Nickname cannot include '/'.");

                setRenameSaving(true);
                try {
                  await setNickname(trimmed);

                  const res = await joinRoomWithNickname(roomId, trimmed);
                  if (!res.ok) return setError(res.message);

                  setNeedsRename(false);
                  setJoined(true);
                } catch (err: any) {
                  setError(err?.message ?? "Failed to join room.");
                } finally {
                  setRenameSaving(false);
                }
              }}
            >
              <input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                placeholder="New nickname"
                autoFocus
              />

              <button
                type="submit"
                disabled={renameSaving}
                className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {renameSaving ? "Saving…" : "Join room"}
              </button>
            </form>
          </section>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Settings</div>

              {isHost ? (
                <button
                  type="button"
                  onClick={onStart}
                  disabled={!joined || starting || accessLost || room?.state !== "lobby"}
                  className="rounded-xl bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-60"
                  title={room?.state !== "lobby" ? "Game already started" : "Start the game"}
                >
                  {starting ? "Starting…" : "Start game"}
                </button>
              ) : (
                <div className="text-xs text-white/50">
                  {room?.state === "lobby" ? "Waiting for host…" : "Starting…"}
                </div>
              )}
            </div>

            {!joined ? (
              <div className="mt-3 text-sm text-white/60">Joining room…</div>
            ) : !room ? (
              <div className="mt-3 text-sm text-white/60">Loading room…</div>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-white/60">Visibility</div>
                  <div className="font-medium">{room.visibility}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white/60">Map</div>
                  <div className="font-medium">{room.mapPackId}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white/60">Mr. X Black</div>
                  <div className="font-medium">{room.mrXBlackTickets}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white/60">Mr. X Double</div>
                  <div className="font-medium">{room.mrXDoubleTickets}</div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Players</div>
              <div className="text-xs text-white/50">{players.length}</div>
            </div>

            <div className="mt-4 space-y-2">
              {players.length === 0 ? (
                <div className="text-sm text-white/60">No players yet.</div>
              ) : (
                players.map((p) => {
                  const pIsHost = !!room && p.uid === room.createdByUid;
                  const canKick = isHost && p.uid !== myUid;

                  return (
                    <div key={p.uid} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          {p.nickname}
                          {pIsHost ? <span className="ml-2 text-xs text-white/50">(host)</span> : null}
                          {p.uid === myUid ? <span className="ml-2 text-xs text-white/50">(you)</span> : null}
                        </div>

                        {canKick ? (
                          <button
                            type="button"
                            onClick={() => onKick(p.uid)}
                            disabled={kickingUid === p.uid || accessLost}
                            className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
                            title="Remove this player from the room"
                          >
                            {kickingUid === p.uid ? "Kicking…" : "Kick"}
                          </button>
                        ) : null}
                      </div>

                      <div className="text-xs text-white/50">{p.uid.slice(0, 6)}…</div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
