import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const stationsPath = path.join(
  ROOT,
  "src/game/mapPacks/_raw/london-classic/stations.txt"
);
const connectionsPath = path.join(
  ROOT,
  "src/game/mapPacks/_raw/london-classic/connections.txt"
);

const outPath = path.join(ROOT, "src/game/mapPacks/londonClassic.ts");

function parseStations(text) {
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed = rows.map((line) => {
    // format: "<id> <x> <y> <types>"
    const [idStr, xStr, yStr] = line.split(/\s+/);
    return { id: Number(idStr), x: Number(xStr), y: Number(yStr) };
  });

  const maxX = Math.max(...parsed.map((p) => p.x));
  const maxY = Math.max(...parsed.map((p) => p.y));

  // Normalize to 0..1
  return parsed.map((p) => ({
    id: p.id,
    x: maxX ? p.x / maxX : 0,
    y: maxY ? p.y / maxY : 0,
  }));
}

function parseConnections(text) {
  const rows = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // group (from,to) -> Set(modes)
  const keyToModes = new Map();

  for (const line of rows) {
    // format: "<a> <b> <mode>"
    const [aStr, bStr, modeRaw] = line.split(/\s+/);
    const a = Number(aStr);
    const b = Number(bStr);

    // dataset uses "water"; our engine uses "ferry"
    const mode = modeRaw === "water" ? "ferry" : modeRaw;

    const from = Math.min(a, b);
    const to = Math.max(a, b);
    const key = `${from}-${to}`;

    if (!keyToModes.has(key)) keyToModes.set(key, new Set());
    keyToModes.get(key).add(mode);
  }

  const edges = [];
  for (const [key, modesSet] of keyToModes.entries()) {
    const [fromStr, toStr] = key.split("-");
    edges.push({
      from: Number(fromStr),
      to: Number(toStr),
      modes: Array.from(modesSet).sort(),
    });
  }

  edges.sort((e1, e2) => (e1.from - e2.from) || (e1.to - e2.to));
  return edges;
}

const stationsText = fs.readFileSync(stationsPath, "utf8");
const connectionsText = fs.readFileSync(connectionsPath, "utf8");

const nodes = parseStations(stationsText);
const edges = parseConnections(connectionsText);

const out = `import type { MapPack } from "./types";

export const londonClassicMapPack: MapPack = {
  id: "london-classic",
  displayName: "London Classic",
  enabled: true,

  // NOTE: node positions come from a schematic coordinate set.
  // We will later add a calibration workflow to align them perfectly to board.jpg.
  nodes: ${JSON.stringify(nodes, null, 2)},
  edges: ${JSON.stringify(edges, null, 2)},

  revealMoves: [3, 8, 13, 18, 24],

  metadata: { hasFerry: true }
};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, "utf8");

console.log("Generated:", outPath);
console.log("Nodes:", nodes.length, "Edges:", edges.length);
console.log("Done.");
