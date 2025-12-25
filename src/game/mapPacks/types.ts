export type MapPackId = string;

export type TransportMode = "taxi" | "bus" | "underground" | "ferry";

/**
 * Node coordinates are normalized (0..1) relative to the board image:
 * x=0 is left edge, x=1 is right edge, y=0 is top edge, y=1 is bottom edge.
 */
export type MapNode = {
  id: number; // station number printed on the board
  x: number;
  y: number;
  label?: string; // optional human-friendly label (can be used for Bengaluru)
};

export type MapEdge = {
  from: number;
  to: number;
  modes: TransportMode[]; // e.g. ["taxi"] or ["taxi", "bus"]
};

export type MapPack = {
  id: MapPackId;
  displayName: string;
  enabled: boolean;

  nodes: MapNode[];
  edges: MapEdge[];

  /**
   * Reveal schedule for Mr. X by *Mr. X move-entry number* (your locked rule).
   * Example: [3, 8, 13, 18, 24]
   */
  revealMoves: number[];

  metadata?: Record<string, unknown>;
};
