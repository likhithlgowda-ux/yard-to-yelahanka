"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { firestoreDb, firebaseAuth } from "@/src/lib/firebase/client";
import type { GameDoc } from "@/src/game/games/schema";
import type { RoomPlayerDoc } from "@/src/game/rooms/schema";
import { subscribeRoomPlayers } from "@/src/game/rooms/roomsClient";

export default function GamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const router = useRouter();

  const [game, setGame] = useState<GameDoc | null>(null);
  const [players, setPlayers] = useState<RoomPlayerDoc[]>([]);
  const myUid = firebaseAuth.currentUser?.uid ?? "";

  useEffect(() => {
    const ref = doc(firestoreDb, "games", gameId);
    return onSnapshot(
      ref,
      (snap) => setGame(snap.exists() ? (snap.data() as GameDoc) : null),
      (err) => {
        if (err?.code === "permission-denied") router.replace("/");
      }
    );
  }, [gameId, router]);

  useEffect(() => {
    return subscribeRoomPlayers(gameId, setPlayers, (err) => {
      if (err?.code === "permission-denied") router.replace("/");
    });
  }, [gameId, router]);

  const myRole = useMemo(() => {
    if (!game || !myUid) return null;
    if (game.mrXUid === myUid) return "Mr. X";
    if (game.detectiveUids.includes(myUid)) return "Detective";
    return "Spectator";
  }, [game, myUid]);

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Game</div>
            <h1 className="mt-1 text-2xl font-semibold">{gameId}</h1>
            <div className="mt-1 text-sm text-white/60">
              Status: {game?.status ?? "Loading…"} • You: {myRole ?? "…"}
            </div>
          </div>

          <Link href={`/room/${gameId}`} className="text-sm text-white/70 hover:text-white">
            Back to lobby
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-lg font-semibold">Roles</div>
            {!game ? (
              <div className="mt-3 text-sm text-white/60">Loading…</div>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-white/60">Mr. X</div>
                  <div className="font-medium">{game.mrXUid.slice(0, 6)}…</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white/60">Detectives</div>
                  <div className="font-medium">{game.detectiveUids.length}</div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-lg font-semibold">Players</div>
            <div className="mt-3 space-y-2">
              {players.map((p) => {
                const role =
                  game?.mrXUid === p.uid ? "Mr. X" : game?.detectiveUids.includes(p.uid) ? "Detective" : "";
                return (
                  <div key={p.uid} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.nickname}</div>
                      <div className="text-xs text-white/60">{role}</div>
                    </div>
                    <div className="text-xs text-white/50">{p.uid.slice(0, 6)}…</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="text-sm text-white/60">
            Next: implement turns + moves using `games/{gameId}` as the only writable state doc.
          </div>
        </div>
      </div>
    </main>
  );
}
