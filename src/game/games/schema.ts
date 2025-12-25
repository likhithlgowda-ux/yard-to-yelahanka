import type { MapPackId } from "@/src/game/rooms/schema";

export type GameStatus = "active" | "finished";

export type GameDoc = {
  id: string;       // == roomId
  roomId: string;   // == id

  createdAtMs: number;
  startedByUid: string;

  status: GameStatus;
  mapPackId: MapPackId;

  mrXBlackTickets: number;
  mrXDoubleTickets: number;

  // Role assignment
  mrXUid: string;
  detectiveUids: string[]; // max 5

  // Turn/flow (placeholder fields to avoid future rewrites)
  turnIndex: number; // 0..(playerOrderUids.length-1)
  playerOrderUids: string[]; // mrX first, then detectives
};
