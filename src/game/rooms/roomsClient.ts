import { firestoreDb } from "@/src/lib/firebase/client";
import { ensureSignedIn } from "@/src/lib/firebase/auth";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  MapPackId,
  NicknameClaimDoc,
  RoomCodeDoc,
  RoomDoc,
  RoomPlayerDoc,
  RoomVisibility,
} from "./schema";
import type { GameDoc } from "@/src/game/games/schema";
import { generateRoomCode, normalizeRoomCode } from "./roomIds";

const ROOMS_COL = "rooms";
const ROOM_CODES_COL = "roomCodes";
const GAMES_COL = "games";

export type CreateRoomInput = {
  visibility: RoomVisibility;
  mapPackId: MapPackId;
  mrXBlackTickets: number;
  mrXDoubleTickets: number;
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeNicknameKey(nickname: string) {
  return nickname.trim().toLowerCase();
}

function pickMrXUid(sortedUids: string[], seed: number) {
  const idx = sortedUids.length ? (seed % sortedUids.length) : 0;
  return sortedUids[idx];
}

export async function createRoom(input: CreateRoomInput): Promise<RoomDoc> {
  const u = await ensureSignedIn();

  const visibility = input.visibility;
  const mapPackId = input.mapPackId;

  const mrXBlackTickets = clampInt(input.mrXBlackTickets, 0, 10);
  const mrXDoubleTickets = clampInt(input.mrXDoubleTickets, 0, 5);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode(6);

    const codeRef = doc(firestoreDb, ROOM_CODES_COL, code);
    const codeSnap = await getDoc(codeRef);
    if (codeSnap.exists()) continue;

    const roomRef = doc(collection(firestoreDb, ROOMS_COL));
    const createdAtMs = Date.now();

    const room: RoomDoc = {
      id: roomRef.id,
      code,
      createdAtMs,
      visibility,
      createdByUid: u.uid,
      mapPackId,
      mrXBlackTickets,
      mrXDoubleTickets,
      state: "lobby",
    };

    const hostName = (u.displayName || "Host").trim() || "Host";

    const hostPlayerRef = doc(firestoreDb, ROOMS_COL, roomRef.id, "players", u.uid);
    const hostPlayer: RoomPlayerDoc = {
      uid: u.uid,
      nickname: hostName,
      nicknameKey: normalizeNicknameKey(hostName),
      joinedAtMs: Date.now(),
      isHost: true,
    };

    const batch = writeBatch(firestoreDb);
    batch.set(roomRef, room);

    const codeDoc: RoomCodeDoc = { code, roomId: roomRef.id, createdAtMs };
    batch.set(codeRef, codeDoc);

    batch.set(hostPlayerRef, hostPlayer, { merge: true });

    await batch.commit();
    return room;
  }

  throw new Error("Failed to create room (code collisions). Try again.");
}

export function subscribePublicRooms(
  cb: (rooms: RoomDoc[]) => void,
  opts?: { limit?: number }
): Unsubscribe {
  const lim = opts?.limit ?? 12;

  const q = query(
    collection(firestoreDb, ROOMS_COL),
    where("visibility", "==", "public"),
    orderBy("createdAtMs", "desc"),
    limit(lim)
  );

  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as RoomDoc)),
    (err) => {
      console.error("subscribePublicRooms error", err);
      cb([]);
    }
  );
}

export async function resolveRoomIdByCode(codeInput: string): Promise<string | null> {
  await ensureSignedIn();

  const code = normalizeRoomCode(codeInput);
  if (code.length !== 6) return null;

  const codeRef = doc(firestoreDb, ROOM_CODES_COL, code);
  const codeSnap = await getDoc(codeRef);
  if (!codeSnap.exists()) return null;

  const data = codeSnap.data() as RoomCodeDoc;
  return data?.roomId ?? null;
}

export function subscribeRoom(
  roomId: string,
  cb: (room: RoomDoc | null) => void,
  onErr?: (err: any) => void
): Unsubscribe {
  const ref = doc(firestoreDb, ROOMS_COL, roomId);
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? (snap.data() as RoomDoc) : null),
    (err) => {
      console.error("subscribeRoom error", err);
      onErr?.(err);
      cb(null);
    }
  );
}

export function subscribeRoomPlayers(
  roomId: string,
  cb: (players: RoomPlayerDoc[]) => void,
  onErr?: (err: any) => void
): Unsubscribe {
  const q = query(collection(firestoreDb, ROOMS_COL, roomId, "players"), orderBy("joinedAtMs", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as RoomPlayerDoc)),
    (err) => {
      console.error("subscribeRoomPlayers error", err);
      onErr?.(err);
      cb([]);
    }
  );
}

export type JoinRoomResult =
  | { ok: true }
  | { ok: false; reason: "nickname_taken" | "invalid_nickname" | "unknown"; message: string };

export async function joinRoomWithNickname(roomId: string, nicknameRaw: string): Promise<JoinRoomResult> {
  const u = await ensureSignedIn();

  const nickname = (nicknameRaw || "").trim();
  if (nickname.length < 2) return { ok: false, reason: "invalid_nickname", message: "Nickname too short." };
  if (nickname.length > 18) return { ok: false, reason: "invalid_nickname", message: "Nickname too long." };
  if (nickname.includes("/")) {
    return { ok: false, reason: "invalid_nickname", message: "Nickname cannot include '/'." };
  }

  const nicknameKey = normalizeNicknameKey(nickname);

  try {
    await runTransaction(firestoreDb, async (tx) => {
      const playerRef = doc(firestoreDb, ROOMS_COL, roomId, "players", u.uid);
      const claimRef = doc(firestoreDb, ROOMS_COL, roomId, "nicknameClaims", nicknameKey);

      const [playerSnap, claimSnap] = await Promise.all([tx.get(playerRef), tx.get(claimRef)]);

      if (claimSnap.exists()) {
        const existing = claimSnap.data() as NicknameClaimDoc;
        if (existing.uid !== u.uid) throw new Error("nickname_taken");
      }

      if (playerSnap.exists()) {
        const prev = playerSnap.data() as RoomPlayerDoc;
        if (prev.nicknameKey && prev.nicknameKey !== nicknameKey) {
          const oldClaimRef = doc(firestoreDb, ROOMS_COL, roomId, "nicknameClaims", prev.nicknameKey);
          const oldClaimSnap = await tx.get(oldClaimRef);
          if (oldClaimSnap.exists()) {
            const old = oldClaimSnap.data() as NicknameClaimDoc;
            if (old.uid === u.uid) tx.delete(oldClaimRef);
          }
        }
      }

      tx.set(claimRef, { nicknameKey, nickname, uid: u.uid, createdAtMs: Date.now() } as NicknameClaimDoc, {
        merge: true,
      });

      tx.set(
        playerRef,
        { uid: u.uid, nickname, nicknameKey, joinedAtMs: Date.now() } as RoomPlayerDoc,
        { merge: true }
      );
    });

    return { ok: true };
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.includes("nickname_taken")) {
      return { ok: false, reason: "nickname_taken", message: "That nickname is already taken in this room." };
    }
    console.error("joinRoomWithNickname error", e);
    return { ok: false, reason: "unknown", message: "Failed to join room." };
  }
}

export async function leaveRoom(roomId: string, transferToUid?: string) {
  const u = await ensureSignedIn();

  await runTransaction(firestoreDb, async (tx) => {
    const roomRef = doc(firestoreDb, ROOMS_COL, roomId);
    const meRef = doc(firestoreDb, ROOMS_COL, roomId, "players", u.uid);

    const [roomSnap, meSnap] = await Promise.all([tx.get(roomRef), tx.get(meRef)]);
    if (!roomSnap.exists()) throw new Error("Room not found.");
    if (!meSnap.exists()) return;

    const room = roomSnap.data() as RoomDoc;
    const me = meSnap.data() as RoomPlayerDoc;

    if (me.nicknameKey) {
      const claimRef = doc(firestoreDb, ROOMS_COL, roomId, "nicknameClaims", me.nicknameKey);
      const claimSnap = await tx.get(claimRef);
      if (claimSnap.exists()) {
        const claim = claimSnap.data() as NicknameClaimDoc;
        if (claim.uid === u.uid) tx.delete(claimRef);
      }
    }

    if (room.createdByUid === u.uid && transferToUid && transferToUid !== u.uid) {
      const targetRef = doc(firestoreDb, ROOMS_COL, roomId, "players", transferToUid);
      const targetSnap = await tx.get(targetRef);
      if (targetSnap.exists()) tx.update(roomRef, { createdByUid: transferToUid });
    }

    tx.delete(meRef);
  });
}

export async function kickPlayer(roomId: string, targetUid: string) {
  const u = await ensureSignedIn();
  if (u.uid === targetUid) throw new Error("Cannot kick self.");

  await runTransaction(firestoreDb, async (tx) => {
    const roomRef = doc(firestoreDb, ROOMS_COL, roomId);
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists()) throw new Error("Room not found.");

    const room = roomSnap.data() as RoomDoc;
    if (room.createdByUid !== u.uid) throw new Error("Only host can kick.");

    const targetRef = doc(firestoreDb, ROOMS_COL, roomId, "players", targetUid);
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists()) return;

    const target = targetSnap.data() as RoomPlayerDoc;

    if (target.nicknameKey) {
      const claimRef = doc(firestoreDb, ROOMS_COL, roomId, "nicknameClaims", target.nicknameKey);
      const claimSnap = await tx.get(claimRef);
      if (claimSnap.exists()) tx.delete(claimRef);
    }

    tx.delete(targetRef);
  });
}

/**
 * Host-only: create games/{roomId} with role assignment + update room to started. [web:253]
 */
export async function startGameWithRoles(roomId: string, lobbyPlayers: RoomPlayerDoc[]) {
  const u = await ensureSignedIn();

  const playersSorted = [...lobbyPlayers].sort((a, b) => a.joinedAtMs - b.joinedAtMs);
  const uids = playersSorted.map((p) => p.uid);

  if (uids.length < 2) throw new Error("Need at least 2 players to start.");
  if (uids.length > 6) throw new Error("Max 6 players supported.");

  const seed = Date.now();
  const mrXUid = pickMrXUid(uids, seed);
  const detectiveUids = uids.filter((x) => x !== mrXUid);

  const playerOrderUids = [mrXUid, ...detectiveUids];

  await runTransaction(firestoreDb, async (tx) => {
    const roomRef = doc(firestoreDb, ROOMS_COL, roomId);
    const gameRef = doc(firestoreDb, GAMES_COL, roomId);

    const [roomSnap, gameSnap] = await Promise.all([tx.get(roomRef), tx.get(gameRef)]);
    if (!roomSnap.exists()) throw new Error("Room not found.");

    const room = roomSnap.data() as RoomDoc;
    if (room.createdByUid !== u.uid) throw new Error("Only host can start.");
    if (room.state !== "lobby") return;
    if (gameSnap.exists()) return;

    // Verify each uid is still a member (no query; individual reads are allowed). [web:253]
    for (const uid of uids) {
      const pRef = doc(firestoreDb, ROOMS_COL, roomId, "players", uid);
      const pSnap = await tx.get(pRef);
      if (!pSnap.exists()) throw new Error("Player list changed. Try again.");
    }

    const game: GameDoc = {
      id: roomId,
      roomId,
      createdAtMs: Date.now(),
      startedByUid: u.uid,
      status: "active",
      mapPackId: room.mapPackId,
      mrXBlackTickets: room.mrXBlackTickets,
      mrXDoubleTickets: room.mrXDoubleTickets,
      mrXUid,
      detectiveUids,
      turnIndex: 0,
      playerOrderUids,
    };

    tx.set(gameRef, game);
    tx.update(roomRef, { state: "started", gameId: roomId, startedAtMs: Date.now() });
  });
}
