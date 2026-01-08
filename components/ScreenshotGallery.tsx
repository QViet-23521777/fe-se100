"use client";

import { useEffect, useState } from "react";

type ScreenshotItem = {
  id: string | number;
  thumbnail: string;
  full: string;
};

export function ScreenshotGallery({
  items,
}: {
  items: ScreenshotItem[];
}) {
  const [active, setActive] = useState<ScreenshotItem | null>(null);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (items.length === 0) {
    return (
      <p className="text-sm text-white/70">No screenshots available.</p>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {items.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => setActive(shot)}
            className="shrink-0 overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Open screenshot"
          >
            <img
              src={shot.thumbnail}
              alt="Screenshot"
              className="h-24 w-[140px] object-cover opacity-80 transition hover:opacity-100"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-[92vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute -right-3 -top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-[#0c143d] shadow-lg"
            >
              Close
            </button>
            <img
              src={active.full}
              alt="Screenshot"
              className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
