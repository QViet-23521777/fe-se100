"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Message = { type: "error" | "success"; text: string } | null;

type SidebarLink = { key: string; title: string; subtitle: string; href: string };

type Promotion = {
  id: string;
  promotionName: string;
  discountType: "Percentage" | "FixedAmount";
  applicableScope: "AllGames" | "SpecificGames" | "Category";
  applicationCondition: string;
  startDate: string;
  expirationDate: string;
  endDate: string;
  quantityIssued: number;
  status: "Active" | "Inactive" | "Expired";
  publisherId: string;
};

function SidebarItem({ item, active }: { item: SidebarLink; active?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`block px-6 py-5 transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
    >
      <p className="text-lg font-semibold text-white">{item.title}</p>
      <p className="mt-1 text-sm text-white/55">{item.subtitle}</p>
    </Link>
  );
}

export default function AdminPromotionsPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [listMsg, setListMsg] = useState<Message>(null);
  const [formMsg, setFormMsg] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    promotionName: "",
    discountType: "Percentage" as Promotion["discountType"],
    applicableScope: "AllGames" as Promotion["applicableScope"],
    applicationCondition: "",
    startDate: "",
    expirationDate: "",
    endDate: "",
    quantityIssued: 0,
    status: "Active" as Promotion["status"],
    publisherId: "",
  });

  const isAdmin = user?.accountType === "admin";
  const isPublisher = user?.accountType === "publisher";

  useEffect(() => {
    if (!token || (!isAdmin && !isPublisher)) {
      router.replace("/user/login");
    }
  }, [isAdmin, isPublisher, router, token]);

  const sidebarLinks: SidebarLink[] = [
    { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
    { key: "manage-accounts", title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts" },
    { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
    { key: "manage-promos", title: "Manage Promo Codes", subtitle: "Create and manage promotions", href: "/admin/promotions" },
  ].filter((link) => (isAdmin ? true : link.key !== "manage-accounts")); // publishers don't manage accounts

  const activeKey = "manage-promos";

  const loadPromos = async () => {
    if (!token) return;
    setLoading(true);
    setListMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl("/admin/promotions"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load promotions");
      setPromos(Array.isArray(data) ? data : []);
    } catch (err) {
      setListMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load promotions" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadPromos();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "quantityIssued"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const publisherId = isPublisher ? (user as any)?.id : form.publisherId;
    if (!publisherId) {
      setFormMsg({ type: "error", text: "Publisher ID is required (admin must select one)." });
      return;
    }
    if (isAdmin && !/^[a-f0-9]{24}$/i.test(publisherId)) {
      setFormMsg({ type: "error", text: "Publisher ID must be a valid 24-char id." });
      return;
    }
    if (!form.applicationCondition.trim()) {
      setFormMsg({ type: "error", text: "Condition/Value is required." });
      return;
    }
    setSaving(true);
    setFormMsg(null);
    try {
      const payload = {
        ...form,
        // For publisher, force publisherId to user.id (API also enforces)
        publisherId,
        startDate: form.startDate || new Date().toISOString(),
        expirationDate: form.expirationDate || form.startDate || new Date().toISOString(),
        endDate: form.endDate || form.expirationDate || form.startDate || new Date().toISOString(),
      };

      const res = await fetch(gameStoreApiUrl("/admin/promotions"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormMsg({ type: "error", text: data?.message || "Failed to create promo." });
        return;
      }
      setFormMsg({ type: "success", text: "Promotion created." });
      await loadPromos();
    } catch {
      setFormMsg({ type: "error", text: "Server error." });
    } finally {
      setSaving(false);
    }
  };

  const scopeLabel = (scope: string) => {
    if (scope === "AllGames") return "All Games";
    if (scope === "SpecificGames") return "Specific Games";
    if (scope === "Category") return "Category";
    return scope;
  };

  const discountLabel = (p: Promotion) => {
    if (p.discountType === "Percentage") return `${p.applicationCondition || ""}`.trim();
    if (p.discountType === "FixedAmount") return `${p.applicationCondition || ""}`.trim();
    return p.discountType;
  };

  const publisherHint = useMemo(() => {
    if (isAdmin) return "Select publisher ID (required by API).";
    if (isPublisher) return "Your publisher ID will be used automatically.";
    return "";
  }, [isAdmin, isPublisher]);

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 shadow-2xl backdrop-blur">
            <div className="bg-white/10 px-6 py-6">
              <p className="text-2xl font-semibold">My Account</p>
              <p className="mt-1 text-sm text-white/60">Account Management</p>
            </div>
            <div className="divide-y divide-white/10">
              {sidebarLinks.map((item) => (
                <SidebarItem key={item.key} item={item} active={item.key === activeKey} />
              ))}
            </div>
            <div className="px-6 py-6">
              <Link
                href="/user/logout"
                className="block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
              >
                Log out
              </Link>
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Promo Codes</h1>
                <p className="text-white/70">
                  Create and manage promotions ({isAdmin ? "Admin" : "Publisher"}).
                </p>
              </div>
              <Link
                href="/user/account"
                className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to Account
              </Link>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
              <form
                className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm text-white/70">Name</label>
                    <input
                      name="promotionName"
                      value={form.promotionName}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="Summer Sale 20%"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Discount Type</label>
                    <select
                      name="discountType"
                      value={form.discountType}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="Percentage">Percentage</option>
                      <option value="FixedAmount">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Applicable Scope</label>
                    <select
                      name="applicableScope"
                      value={form.applicableScope}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="AllGames">All Games</option>
                      <option value="SpecificGames">Specific Games</option>
                      <option value="Category">Category</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-white/70">
                      Condition / Value (e.g., "-20" or "-5 USD" or "Category: RPG")
                    </label>
                    <input
                      name="applicationCondition"
                      value={form.applicationCondition}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="20% off"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Start Date</label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Expiration Date</label>
                    <input
                      type="datetime-local"
                      name="expirationDate"
                      value={form.expirationDate}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">End Date</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Quantity Issued</label>
                    <input
                      type="number"
                      min={0}
                      name="quantityIssued"
                      value={form.quantityIssued}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                  {isAdmin ? (
                    <div className="md:col-span-2">
                      <label className="text-sm text-white/70">Publisher ID</label>
                      <input
                        name="publisherId"
                        value={form.publisherId}
                        onChange={handleChange}
                        required
                        className="input"
                        placeholder="Publisher ID"
                      />
                      <p className="text-xs text-white/60">{publisherHint}</p>
                    </div>
                  ) : (
                    <div className="md:col-span-2 text-sm text-white/70">
                      {publisherHint}
                    </div>
                  )}
                </div>

                {formMsg ? (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      formMsg.type === "success"
                        ? "border-green-400/40 bg-green-500/10 text-green-100"
                        : "border-red-400/40 bg-red-500/10 text-red-100"
                    }`}
                  >
                    {formMsg.text}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#1b1a55] px-5 py-3 text-sm font-semibold text-white hover:bg-[#23225e] transition disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Create Promotion"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        promotionName: "",
                        discountType: "Percentage",
                        applicableScope: "AllGames",
                        applicationCondition: "",
                        startDate: "",
                        expirationDate: "",
                        endDate: "",
                        quantityIssued: 0,
                        status: "Active",
                        publisherId: "",
                      })
                    }
                    className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                  >
                    Reset
                  </button>
                </div>
              </form>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Existing Promotions</h2>
                  <button
                    type="button"
                    onClick={loadPromos}
                    className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Refresh
                  </button>
                </div>

                {listMsg ? (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      listMsg.type === "success"
                        ? "border-green-400/40 bg-green-500/10 text-green-100"
                        : "border-red-400/40 bg-red-500/10 text-red-100"
                    }`}
                  >
                    {listMsg.text}
                  </div>
                ) : null}

                {loading ? (
                  <p className="text-white/70">Loading promotions…</p>
                ) : promos.length === 0 ? (
                  <p className="text-white/70">No promotions yet.</p>
                ) : (
                  <div className="space-y-3">
                    {promos.map((promo) => (
                      <div
                        key={promo.id}
                        className="rounded-2xl border border-white/10 bg-[#0c1430] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-lg font-semibold">{promo.promotionName}</p>
                            <p className="text-sm text-white/70">
                              {promo.discountType} · {scopeLabel(promo.applicableScope)} ·{" "}
                              {discountLabel(promo)}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              promo.status === "Active"
                                ? "bg-green-500/15 text-green-200"
                                : promo.status === "Expired"
                                ? "bg-red-500/15 text-red-200"
                                : "bg-white/10 text-white/80"
                            }`}
                          >
                            {promo.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/55">
                          Start: {new Date(promo.startDate).toLocaleString()} · Exp:{" "}
                          {new Date(promo.expirationDate).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 10px;
          background: #535c91;
          padding: 12px 14px;
          color: white;
          outline: none;
          border: 1px solid transparent;
        }
        .input::placeholder {
          color: rgba(255, 255, 255, 0.65);
        }
        .input:focus {
          border-color: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}
