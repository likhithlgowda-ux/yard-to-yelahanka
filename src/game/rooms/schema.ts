export type RoomVisibility = "private" | "public";
export type MapPackId = "london-classic" | "namma-bengaluru";

export type RoomState = "lobby" | "started" | "finished";

export type RoomDoc = {
  id: string;
  code: string;
  createdAtMs: number;
  visibility: RoomVisibility;

  createdByUid: string;

  mapPackId: MapPackId;

  mrXBlackTickets: number;
  mrXDoubleTickets: number;

  // lifecycle
  state: RoomState;
  gameId?: string; // same as roomId
  startedAtMs?: number;
};

export type RoomCodeDoc = {
  code: string;
  roomId: string;
  createdAtMs: number;
};

export type RoomPlayerDoc = {
  uid: string;
  nickname: string;
  nicknameKey: string;
  joinedAtMs: number;

  isHost?: boolean;
};

export type NicknameClaimDoc = {
  nicknameKey: string;
  nickname: string;
  uid: string;
  createdAtMs: number;
};
