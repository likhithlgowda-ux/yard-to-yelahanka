"use client";

type Props = {
  id: number;
  leftPx: number;
  topPx: number;
  tooltip: string;
  onClick?: (id: number) => void;

  // Increase this if hovering is hard; it does NOT change stored positions.
  hitSizePx?: number;
};

export default function NodeDot({
  id,
  leftPx,
  topPx,
  tooltip,
  onClick,
  hitSizePx = 26,
}: Props) {
  return (
    <div
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: leftPx, top: topPx }}
    >
      {/* Invisible hit target (still receives hover/click) */}
      <button
        type="button"
        aria-label={`Station ${id}`}
        onClick={() => onClick?.(id)}
        className="bg-transparent"
        style={{ width: hitSizePx, height: hitSizePx }}
      />

      {/* Tooltip */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[110%] scale-0 transform rounded-md bg-black/85 px-2 py-1 text-xs text-white shadow-md transition-all group-hover:scale-100">
        <div className="font-medium">Station {id}</div>
        <div className="whitespace-pre">{tooltip}</div>
      </div>
    </div>
  );
}
