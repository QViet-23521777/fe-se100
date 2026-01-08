"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  type: "steam" | "game";
  id: string;
  steamAppId?: number;
  name: string;
  avatarUrl?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  discountPercent?: number | null;
};

export function TopBarSearch({
  className = "",
  limit = 8,
}: {
  className?: string;
  limit?: number;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [items, setItems] = useState<Suggestion[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= 1;

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;

      if (
        inputRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
      setActiveIndex(-1);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const timeout = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(
            normalizedQuery
          )}&limit=${Math.min(Math.max(Math.floor(limit), 1), 20)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          setItems([]);
          setActiveIndex(-1);
          return;
        }

        const data = (await res.json()) as unknown;
        const parsed = Array.isArray(data) ? (data as Suggestion[]) : [];
        setItems(parsed);
        setActiveIndex(parsed.length ? 0 : -1);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setItems([]);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      abortRef.current?.abort();
    };
  }, [canSearch, limit, normalizedQuery, open]);

  function goToItem(item: Suggestion) {
    setOpen(false);
    setQuery("");
    setItems([]);
    setActiveIndex(-1);
    if (item.type === "steam" && item.steamAppId) {
      router.push(`/product/${item.steamAppId}`);
      return;
    }
    router.push(`/product/game/${item.id}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => {
        const next = current + 1;
        return next >= items.length ? 0 : next;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        const next = current - 1;
        return next < 0 ? items.length - 1 : next;
      });
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < items.length) {
        event.preventDefault();
        goToItem(items[activeIndex]);
        return;
      }

      if (normalizedQuery.length > 0) {
        event.preventDefault();
        setOpen(false);
        router.push(`/browse?search=${encodeURIComponent(normalizedQuery)}`);
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex w-full items-center gap-2 rounded-[18px] bg-[#1b1a55] px-4 py-2 text-sm text-white/70">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search store"
          className="w-full bg-transparent text-white placeholder:text-white/60 outline-none"
          aria-label="Search games"
          autoComplete="off"
        />
        {loading ? (
          <span className="text-xs text-white/60">Searching…</span>
        ) : null}
      </div>

      {open && canSearch ? (
        <div
          ref={popoverRef}
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0c143d]/95 shadow-2xl backdrop-blur"
        >
          {items.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-white/70">
              No results for “{normalizedQuery}”
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto py-2">
              {items.map((item, idx) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      goToItem(item);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                      idx === activeIndex
                        ? "bg-white/10 text-white"
                        : "text-white/85 hover:bg-white/5"
                    }`}
                  >
                    <div className="h-10 w-16 overflow-hidden rounded-lg bg-white/5">
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                          {String(item.steamAppId)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {item.discountPercent && item.discountPercent > 0 ? (
                        <div className="mb-1 flex justify-end">
                          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#1b1a55]">
                            -{item.discountPercent}%
                          </span>
                        </div>
                      ) : null}
                      <div className="flex flex-col items-end leading-tight">
                        {item.originalPrice ? (
                          <span className="text-[11px] text-white/50 line-through">
                            {item.originalPrice}
                          </span>
                        ) : null}
                        <span className="text-sm font-semibold text-white">
                          {item.price ?? "—"}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
