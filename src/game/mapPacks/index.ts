import type { MapPack, MapPackId } from "./types";
import { londonClassicMapPackAligned as londonClassicMapPack } from "./londonClassic";

const nammaBengaluruComingSoon: MapPack = {
  id: "namma-bengaluru",
  displayName: "Namma Bengaluru (Coming soon)",
  enabled: false,
  nodes: [],
  edges: [],
  revealMoves: [3, 8, 13, 18, 24],
  metadata: {},
};

export const MAP_PACKS: MapPack[] = [londonClassicMapPack, nammaBengaluruComingSoon];

export function getMapPack(id: MapPackId): MapPack | undefined {
  return MAP_PACKS.find((m) => m.id === id);
}
