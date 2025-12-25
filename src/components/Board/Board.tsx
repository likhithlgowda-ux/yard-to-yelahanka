"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapPack } from "@/src/game/mapPacks/types";
import NodeDot from "./NodeDot";

type Props = {
  mapPack: MapPack;
};

type Mode = "taxi" | "bus" | "underground" | "ferry";

function modeLabel(m: Mode) {
  if (m === "taxi") return "Taxi";
  if (m === "bus") return "Bus";
  if (m === "underground") return "Underground";
  return "Ferry";
}

export default function Board({ mapPack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [container, setContainer] = useState({ w: 0, h: 0 });
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setContainer({ w: r.width, h: r.height });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const fit = useMemo(() => {
    if (!imgNatural || !container.w || !container.h) return null;

    const scale = Math.min(container.w / imgNatural.w, container.h / imgNatural.h);
    const drawW = imgNatural.w * scale;
    const drawH = imgNatural.h * scale;

    return {
      drawW,
      drawH,
      offsetX: (container.w - drawW) / 2,
      offsetY: (container.h - drawH) / 2,
    };
  }, [imgNatural, container]);

  const tooltipByNodeId = useMemo(() => {
    const modes: Mode[] = ["taxi", "bus", "underground", "ferry"];

    const adj = new Map<number, Record<Mode, number[]>>();
    const ensure = (id: number) => {
      if (!adj.has(id)) adj.set(id, { taxi: [], bus: [], underground: [], ferry: [] });
      return adj.get(id)!;
    };

    for (const e of mapPack.edges) {
      for (const m of e.modes as Mode[]) {
        const a = ensure(e.from);
        const b = ensure(e.to);
        a[m].push(e.to);
        b[m].push(e.from);
      }
    }

    const out = new Map<number, string>();
    for (const n of mapPack.nodes) {
      const rec = adj.get(n.id) ?? { taxi: [], bus: [], underground: [], ferry: [] };

      for (const m of modes) rec[m] = Array.from(new Set(rec[m])).sort((x, y) => x - y);

      const lines: string[] = [];
      for (const m of modes) {
        if (rec[m].length) lines.push(`${modeLabel(m)}: ${rec[m].join(", ")}`);
      }
      out.set(n.id, lines.length ? lines.join("\n") : "No connections");
    }

    return out;
  }, [mapPack.edges, mapPack.nodes]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-black/10 shadow-sm bg-neutral-100"
      >
        <Image
          src="/maps/london-classic/board.jpg"
          alt="London Classic board"
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          style={{ objectFit: "contain" }}
          quality={100}
          unoptimized
          onLoadingComplete={(img) => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })}
        />

        {fit &&
          mapPack.nodes.map((n) => (
            <NodeDot
              key={n.id}
              id={n.id}
              leftPx={fit.offsetX + n.x * fit.drawW}
              topPx={fit.offsetY + n.y * fit.drawH}
              tooltip={tooltipByNodeId.get(n.id) ?? "No connections"}
            />
          ))}
      </div>
    </div>
  );
}
