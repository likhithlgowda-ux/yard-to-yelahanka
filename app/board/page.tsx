"use client";

import Board from "@/src/components/Board/Board";
import { londonClassicMapPackAligned } from "@/src/game/mapPacks/londonClassic";
import Link from "next/link";

export default function BoardPage() {
  return (
    <main className="min-h-screen px-6 py-8 text-white">
      {/* Minimal navy background (no glass) */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px circle at 15% 15%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 55%), radial-gradient(900px circle at 85% 20%, rgba(14,165,233,0.10) 0%, rgba(14,165,233,0) 55%), linear-gradient(180deg, #060a16 0%, #070d1f 55%, #050812 100%)",
        }}
      />

      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">London Classic</h1>
            <p className="mt-1 text-sm text-white/65">Hover stations to view connections.</p>
          </div>

          <Link
            href="/"
            className="text-sm text-white/75 hover:text-white transition-colors"
          >
            Back
          </Link>
        </div>

        {/* Content card */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 shadow-sm">
          <Board mapPack={londonClassicMapPackAligned} />
        </div>
      </div>
    </main>
  );
}
