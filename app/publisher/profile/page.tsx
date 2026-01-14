"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { PublisherAccountSidebar } from "@/components/PublisherAccountSidebar";

type PublisherProfile = {
  id: string;
  publisherName: string;
  email: string;
  phoneNumber: string;
  socialMedia?: string;
  bankType?: string;
  bankName?: string;
  contractDate?: string;
  contractDuration?: number;
  activityStatus?: string;
};

type ContractInfo = {
  contractDate: string;
  contractDuration: number;
  expiryDate: string;
  activityStatus: string;
  isActive: boolean;
  daysRemaining: number;
  isExpiringSoon: boolean;
};

type GameCounts = {
  totalGames: number;
  releasedGames: number;
  upcomingGames: number;
  delistedGames: number;
};

type Message = { type: "success" | "error"; text: string } | null;

export default function PublisherProfilePage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<PublisherProfile | null>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [counts, setCounts] = useState<GameCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const [form, setForm] = useState({
    publisherName: "",
    phoneNumber: "",
    socialMedia: "",
    bankType: "",
    bankName: "",
  });

  const isPublisher = user?.accountType === "publisher";

  useEffect(() => {
    if (!token || !isPublisher) {
      router.replace("/publisher/login");
      return;
    }

    let active = true;
    (async () => {
      setLoading(true);
      setMessage(null);
      try {
        const [pRes, cRes, gRes] = await Promise.all([
          fetch(gameStoreApiUrl("/publisher/me"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch(gameStoreApiUrl("/publisher/me/contract"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch(gameStoreApiUrl("/publisher/me/games/counts"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ]);

        const pData = await pRes.json().catch(() => null);
        const cData = await cRes.json().catch(() => null);
        const gData = await gRes.json().catch(() => null);

        if (!pRes.ok) throw new Error(pData?.message || "Failed to load profile");
        if (cRes.ok) setContract(cData);
        if (gRes.ok) setCounts(gData);

        if (!active) return;
        setProfile(pData);
        setForm({
          publisherName: pData?.publisherName ?? "",
          phoneNumber: pData?.phoneNumber ?? "",
          socialMedia: pData?.socialMedia ?? "",
          bankType: pData?.bankType ?? "",
          bankName: pData?.bankName ?? "",
        });
      } catch (err) {
        if (!active) return;
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to load profile" });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isPublisher, router, token]);

  const contractLabel = useMemo(() => {
    if (!contract) return "";
    const expiry = new Date(contract.expiryDate);
    if (Number.isNaN(expiry.getTime())) return "";
    const suffix = contract.isExpiringSoon ? " (expiring soon)" : "";
    return `${expiry.toLocaleDateString()}${suffix}`;
  }, [contract]);

  async function onSave() {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(gameStoreApiUrl("/publisher/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          publisherName: form.publisherName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          socialMedia: form.socialMedia.trim() || undefined,
          bankType: form.bankType.trim() || undefined,
          bankName: form.bankName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to save profile");
      setProfile(data);
      setMessage({ type: "success", text: "Saved successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <PublisherAccountSidebar />

          <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-8 shadow-2xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Personal Information</p>
            <h1 className="mt-2 text-3xl font-semibold">Publisher profile</h1>
            <p className="mt-2 text-sm text-white/60">Update contact and payout details for your publisher account.</p>

            {loading ? (
              <div className="mt-8 text-white/70">Loading...</div>
            ) : !profile ? (
              <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                {message?.text || "Profile not found."}
              </div>
            ) : (
              <>
                <section className="mt-8 rounded-2xl border border-white/10 bg-[#0c143d]/60 p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm text-white/70">Publisher name</label>
                      <input
                        value={form.publisherName}
                        onChange={(e) => setForm((p) => ({ ...p, publisherName: e.target.value }))}
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Email</label>
                      <input
                        value={profile.email}
                        disabled
                        className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70 outline-none ring-1 ring-white/10"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Phone number</label>
                      <input
                        value={form.phoneNumber}
                        onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm text-white/70">Social media (optional)</label>
                      <input
                        value={form.socialMedia}
                        onChange={(e) => setForm((p) => ({ ...p, socialMedia: e.target.value }))}
                        placeholder="https://..."
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Bank type (optional)</label>
                      <input
                        value={form.bankType}
                        onChange={(e) => setForm((p) => ({ ...p, bankType: e.target.value }))}
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Bank name (optional)</label>
                      <input
                        value={form.bankName}
                        onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                        className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-white/70">
                      Status: <span className="font-semibold text-white">{profile.activityStatus || "Active"}</span>
                    </div>
                    <button
                      onClick={onSave}
                      disabled={saving}
                      className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#1b1a55] disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </section>

                <section className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                    <p className="text-sm text-white/60">Contract expiry</p>
                    <p className="mt-1 text-lg font-semibold">{contractLabel || "—"}</p>
                    {contract ? <p className="mt-1 text-xs text-white/50">Days remaining: {contract.daysRemaining}</p> : null}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                    <p className="text-sm text-white/60">Games</p>
                    <p className="mt-1 text-lg font-semibold">{counts?.totalGames ?? 0}</p>
                    <p className="mt-1 text-xs text-white/50">
                      Released: {counts?.releasedGames ?? 0} · Upcoming: {counts?.upcomingGames ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0c143d]/60 p-5">
                    <p className="text-sm text-white/60">Quick actions</p>
                    <button
                      onClick={() => router.push("/publisher/statistics")}
                      className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                    >
                      View statistics
                    </button>
                    <button
                      onClick={() => router.push("/user/manage-games")}
                      className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                    >
                      Manage games
                    </button>
                  </div>
                </section>
              </>
            )}

            {message ? (
              <div
                className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
                  message.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-100"
                    : "border-red-500/40 bg-red-500/10 text-red-100"
                }`}
              >
                {message.text}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

