"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type TargetType = "game" | "review";
type GameType = "steam" | "custom";

type Props = {
  open: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  targetGameType?: GameType;
  title?: string;
};

const categories = [
  "Spam",
  "Harassment",
  "HateSpeech",
  "Illegal",
  "Copyright",
  "Scam",
  "Other",
] as const;

export function ReportDialog({ open, onClose, targetType, targetId, targetGameType, title }: Props) {
  const router = useRouter();
  const { user, token } = useAuth();

  const canReport = Boolean(token) && (user?.accountType === "customer" || user?.accountType === "publisher");
  const nextPath = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";

  const endpoint = useMemo(() => {
    if (!user?.accountType) return null;
    if (user.accountType === "customer") return "/customers/me/reports";
    if (user.accountType === "publisher") return "/publisher/me/reports";
    return null;
  }, [user?.accountType]);

  const [category, setCategory] = useState<(typeof categories)[number]>("Other");
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  if (!open) return null;

  async function submit() {
    if (!endpoint || !token) return;
    const trimmed = reasonText.trim();
    if (trimmed.length < 10) {
      setMsg({ type: "error", text: "Please enter at least 10 characters." });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType,
          targetId: String(targetId),
          targetGameType,
          reasonCategory: category,
          reasonText: trimmed,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const text =
          data?.error?.message ||
          data?.message ||
          `Failed to submit report (HTTP ${res.status}).`;
        throw new Error(text);
      }
      setMsg({ type: "success", text: "Report submitted. Thank you." });
      setReasonText("");
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to submit report." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Close report dialog"
      />

      <div className="relative w-full max-w-[560px] rounded-[24px] border border-white/10 bg-[#0c143d]/90 p-6 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-white/70">REPORT</p>
            <h2 className="mt-1 text-2xl font-semibold">{title || "Report content"}</h2>
            <p className="mt-1 text-sm text-white/65">
              Tell us what’s wrong. Admins will review this report.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {!canReport ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/80">
              You need to log in with a customer or publisher account to submit a report.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/user/login?next=${encodeURIComponent(nextPath)}`)}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55]"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm text-white/70">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#0c143d]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-white/70">Reason</label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Describe the issue (min 10 characters)…"
                  rows={5}
                  maxLength={2000}
                  className="mt-1 w-full resize-none rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                />
                <p className="mt-1 text-xs text-white/50">{reasonText.trim().length}/2000</p>
              </div>
            </div>

            {msg ? (
              <div
                className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                  msg.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-100"
                    : "border-red-500/40 bg-red-500/10 text-red-100"
                }`}
              >
                {msg.text}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
