"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type ReportTargetType = "game" | "review";
type ReportGameType = "steam" | "custom";
type ReportStatus = "Pending" | "Resolved" | "Rejected";

type Message = { type: "error" | "success"; text: string } | null;

const CATEGORIES = ["Spam", "Harassment", "HateSpeech", "Illegal", "Copyright", "Scam", "Other"] as const;

export function ReportButton({
  targetType,
  targetId,
  targetGameType,
  label = "Report",
  compact = false,
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetGameType?: ReportGameType;
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { user, token } = useAuth();

  const canReport = Boolean(token && (user?.accountType === "customer" || user?.accountType === "publisher"));

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Message>(null);

  const endpoint = useMemo(() => {
    if (!user?.accountType) return null;
    if (user.accountType === "customer") return "/customers/me/reports";
    if (user.accountType === "publisher") return "/publisher/me/reports";
    return null;
  }, [user?.accountType]);

  const currentPath = useMemo(() => {
    try {
      return `${window.location.pathname}${window.location.search}`;
    } catch {
      return "/";
    }
  }, []);

  const openDialog = () => {
    if (!token) {
      router.push(`/user/login?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (!endpoint) {
      setMsg({ type: "error", text: "Only customer/publisher accounts can submit reports." });
      return;
    }
    setOpen(true);
    setMsg(null);
  };

  const closeDialog = () => {
    if (submitting) return;
    setOpen(false);
    setCategory("");
    setReason("");
    setMsg(null);
  };

  const submit = async () => {
    if (!token || !endpoint) return;
    const reasonText = reason.trim();
    if (reasonText.length < 10) {
      setMsg({ type: "error", text: "Reason must be at least 10 characters." });
      return;
    }
    if (targetType === "game" && !targetGameType) {
      setMsg({ type: "error", text: "Missing game type for this report." });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const payload: any = {
        targetType,
        targetId: String(targetId),
        reasonText,
        ...(category ? { reasonCategory: category } : {}),
        ...(targetType === "game" ? { targetGameType } : {}),
      };

      const res = await fetch(gameStoreApiUrl(endpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit report");
      }

      setMsg({ type: "success", text: `Report submitted (${(data as any)?.status || ("Pending" as ReportStatus)}).` });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to submit report" });
    } finally {
      setSubmitting(false);
    }
  };

  const buttonClass = compact
    ? "rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
    : "rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10";

  return (
    <>
      <button type="button" onClick={openDialog} className={buttonClass} aria-label={label}>
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0c143d] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Report</p>
                <h2 className="mt-2 text-xl font-semibold">Tell us what’s wrong</h2>
                <p className="mt-2 text-sm text-white/70">Reports help admins review and take action.</p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className={`rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white ${
                  submitting ? "opacity-60" : "hover:bg-white/10"
                }`}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-white/80">Category (optional)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                  disabled={submitting}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0c143d] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white/80">Reason</label>
                  <span className="text-xs text-white/60">{reason.trim().length}/2000</span>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-2 h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                  placeholder="Describe the issue (min 10 characters)..."
                  maxLength={2000}
                  disabled={submitting}
                />
              </div>

              {msg ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    msg.type === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-100"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {msg.text}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={submitting}
                  className={`rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white ${
                    submitting ? "opacity-60" : "hover:bg-white/10"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={submitting || !canReport}
                  className={`rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1b1a55] ${
                    submitting || !canReport ? "opacity-60" : "hover:bg-white/90"
                  }`}
                >
                  {submitting ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
