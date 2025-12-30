"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type GameForm = {
  name: string;
  genre: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  releaseDate: string;
  version: string;
  originalPrice: string;
  discountPrice: string;
  steamAppId: string;
};

export default function CreateGamePage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const canAccess = useMemo(
    () => Boolean(user && token && (user.accountType === "publisher" || user.accountType === "admin")),
    [token, user]
  );

  const [form, setForm] = useState<GameForm>({
    name: "",
    genre: "",
    description: "",
    imageUrl: "",
    videoUrl: "",
    releaseDate: "",
    version: "",
    originalPrice: "",
    discountPrice: "",
    steamAppId: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!canAccess) {
      return;
    }
  }, [canAccess]);

  const updateField = (name: keyof GameForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccess || !token) {
      setMessage({ type: "error", text: "You must be logged in as a publisher or admin." });
      return;
    }

    const original = Number(form.originalPrice || 0);
    const discount = form.discountPrice ? Number(form.discountPrice) : 0;
    if (discount > original) {
      setMessage({ type: "error", text: "Discount price cannot exceed original price." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        name: form.name.trim(),
        genre: form.genre.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        videoUrl: form.videoUrl.trim(),
        releaseDate: form.releaseDate,
        version: form.version.trim(),
        originalPrice: original,
        discountPrice: discount || undefined,
        steamAppId: form.steamAppId ? Number(form.steamAppId) : undefined,
      };

      const res = await fetch(gameStoreApiUrl("/games"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to create game");
      }

      setMessage({ type: "success", text: "Game created successfully." });
      router.push("/publisher/dashboard");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to create game." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="mx-auto max-w-lg rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-center shadow-xl">
            <p className="mb-4 text-lg text-red-100">Bạn cần đăng nhập bằng tài khoản Publisher hoặc Admin.</p>
            <button
              onClick={() => router.push("/user/login?next=/publisher/game/create")}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55]"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-8 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-[#0c143d]/70 p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/60">Publisher</p>
              <h1 className="text-3xl font-semibold">Add New Game</h1>
            </div>
            <button
              type="button"
              onClick={() => router.push("/publisher/dashboard")}
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Dashboard
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-white/70">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Genre</label>
                <input
                  value={form.genre}
                  onChange={(e) => updateField("genre", e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/70">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                required
                rows={4}
                className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-white/70">Image URL</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => updateField("imageUrl", e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Video URL</label>
                <input
                  value={form.videoUrl}
                  onChange={(e) => updateField("videoUrl", e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm text-white/70">Release Date</label>
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => updateField("releaseDate", e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Version</label>
                <input
                  value={form.version}
                  onChange={(e) => updateField("version", e.target.value)}
                  required
                  placeholder="1.0.0"
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Steam App ID (optional)</label>
                <input
                  value={form.steamAppId}
                  onChange={(e) => updateField("steamAppId", e.target.value)}
                  placeholder="e.g. 730"
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-white/70">Original Price</label>
                <input
                  type="number"
                  min="0"
                  value={form.originalPrice}
                  onChange={(e) => updateField("originalPrice", e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="text-sm text-white/70">Discount Price (optional)</label>
                <input
                  type="number"
                  min="0"
                  value={form.discountPrice}
                  onChange={(e) => updateField("discountPrice", e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
              </div>
            </div>

            {message ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-100"
                    : "border-red-500/40 bg-red-500/10 text-red-100"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Game"}
              </button>
              <button
                type="button"
                onClick={() => setForm({
                  name: "",
                  genre: "",
                  description: "",
                  imageUrl: "",
                  videoUrl: "",
                  releaseDate: "",
                  version: "",
                  originalPrice: "",
                  discountPrice: "",
                  steamAppId: "",
                })}
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

