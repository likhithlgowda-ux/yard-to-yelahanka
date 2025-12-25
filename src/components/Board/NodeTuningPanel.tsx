"use client";

import type { MapPack } from "@/src/game/mapPacks/types";

export type NodeOverride = { x: number; y: number };
export type NodeOverrides = Record<number, NodeOverride>;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Props = {
  mapPack: MapPack;
  enabled: boolean;
  bgKey: string;

  currentIndex: number;
  setCurrentIndex: (i: number) => void;

  overrides: NodeOverrides;
  setOverrides: (next: NodeOverrides) => void;

  draft: NodeOverride;
  setDraft: (next: NodeOverride) => void;

  onConfirmNext: () => void;
  onResetNode: () => void;
  onClearAll: () => void;
  onExport: () => void;
};

export default function NodeTuningPanel({
  mapPack,
  enabled,
  bgKey,
  currentIndex,
  setCurrentIndex,
  overrides,
  setOverrides,
  draft,
  setDraft,
  onConfirmNext,
  onResetNode,
  onClearAll,
  onExport,
}: Props) {
  if (!enabled) return null;

  const node = mapPack.nodes[currentIndex];
  const nodeId = node?.id ?? -1;

  const saved = overrides[nodeId];
  const isSaved = Boolean(saved);

  const setX = (x: number) => setDraft({ x: clamp01(x), y: draft.y });
  const setY = (y: number) => setDraft({ x: draft.x, y: clamp01(y) });

  return (
    <div className="mt-4 p-3 rounded-lg border border-black/10 bg-white/70 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium">
          Node tuning ({bgKey})
        </div>
        <div className="text-xs text-neutral-600">
          {currentIndex + 1}/{mapPack.nodes.length} · Node {nodeId}{" "}
          {isSaved ? "(saved)" : "(new)"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span>x: {draft.x.toFixed(4)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.0005}
            value={draft.x}
            onChange={(e) => setX(Number(e.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>y: {draft.y.toFixed(4)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.0005}
            value={draft.y}
            onChange={(e) => setY(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-md border border-black/15 bg-white hover:bg-neutral-50 text-sm"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
        >
          Prev
        </button>

        <button
          type="button"
          className="px-3 py-1.5 rounded-md border border-black/15 bg-white hover:bg-neutral-50 text-sm"
          onClick={onConfirmNext}
        >
          Confirm + Next
        </button>

        <button
          type="button"
          className="px-3 py-1.5 rounded-md border border-black/15 bg-white hover:bg-neutral-50 text-sm"
          onClick={() => setCurrentIndex(Math.min(mapPack.nodes.length - 1, currentIndex + 1))}
        >
          Skip
        </button>

        <button
          type="button"
          className="px-3 py-1.5 rounded-md border border-black/15 bg-white hover:bg-neutral-50 text-sm"
          onClick={onResetNode}
        >
          Reset node
        </button>

        <button
          type="button"
          className="px-3 py-1.5 rounded-md border border-black/15 bg-white hover:bg-neutral-50 text-sm"
          onClick={onExport}
        >
          Export JSON
        </button>

        <button
          type="button"
          className="px-3 py-1.5 rounded-md border border-red-200 bg-white hover:bg-red-50 text-sm text-red-700"
          onClick={onClearAll}
        >
          Clear all overrides
        </button>
      </div>

      <div className="mt-2 text-xs text-neutral-600">
        Tip: while tuning, click on the board to place the current node exactly under the cursor.
      </div>

      <div className="mt-1 text-xs text-neutral-500">
        Overrides saved: {Object.keys(overrides).length}
      </div>
    </div>
  );
}
