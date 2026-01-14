"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import { PublisherAccountSidebar } from "@/components/PublisherAccountSidebar";

type Message = { type: "error" | "success"; text: string } | null;

type SidebarLink = { key: string; title: string; subtitle: string; href: string };

type Promotion = {
  id: string;
  promotionName: string;
  code?: string;
  discountType: "Percentage" | "FixedAmount";
  applicableScope: "AllGames" | "SpecificGames" | "Category";
  applicationCondition: string;
  startDate: string;
  expirationDate: string;
  endDate: string;
  quantityIssued: number;
  status: "Active" | "Inactive" | "Expired";
  publisherId: string;
  scope?: "Publisher" | "Store" | string;
  gameIds?: string[];
};

type Publisher = {
  id: string;
  publisherName?: string;
  email?: string;
};

type Game = {
  id: string;
  name: string;
  genre: string;
};

function randomSaleCodeChunk(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid confusing chars (I, O, 0, 1)
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function generateGameSaleCode(promotionName: string) {
  const clean = String(promotionName || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
  const prefix = (clean.split(" ")[0] || "SALE").slice(0, 6);
  return `${prefix}${randomSaleCodeChunk(6)}`;
}

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

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesMsg, setGamesMsg] = useState<Message>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState<Message>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editGames, setEditGames] = useState<Game[]>([]);
  const [editGamesLoading, setEditGamesLoading] = useState(false);
  const [editGamesMsg, setEditGamesMsg] = useState<Message>(null);

  const [form, setForm] = useState({
    promotionName: "",
    code: "",
    discountType: "Percentage" as Promotion["discountType"],
    applicableScope: "AllGames" as Promotion["applicableScope"],
    applicationCondition: "",
    startDate: "",
    expirationDate: "",
    endDate: "",
    quantityIssued: 0,
    status: "Active" as Promotion["status"],
    publisherId: "",
    scope: "Publisher" as NonNullable<Promotion["scope"]>,
    gameIds: [] as string[],
  });

  const [editForm, setEditForm] = useState({
    promotionName: "",
    code: "",
    discountType: "Percentage" as Promotion["discountType"],
    applicableScope: "AllGames" as Promotion["applicableScope"],
    applicationCondition: "",
    startDate: "",
    expirationDate: "",
    endDate: "",
    quantityIssued: 0,
    status: "Active" as Promotion["status"],
    publisherId: "",
    scope: "Publisher" as NonNullable<Promotion["scope"]>,
    gameIds: [] as string[],
  });

  const isAdmin = user?.accountType === "admin";
  const isPublisher = user?.accountType === "publisher";

  useEffect(() => {
    if (!isAdmin) return;
    setForm((prev) => {
      const untouched =
        !prev.promotionName.trim() &&
        !prev.code.trim() &&
        !prev.applicationCondition.trim() &&
        !prev.publisherId.trim() &&
        prev.gameIds.length === 0 &&
        !prev.startDate &&
        !prev.expirationDate &&
        !prev.endDate;
      if (!untouched) return prev;
      if (prev.scope === "Store") return prev;
      return { ...prev, scope: "Store" };
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!token || (!isAdmin && !isPublisher)) {
      router.replace(`/user/login?next=${encodeURIComponent("/user/manage-promos")}`);
    }
  }, [isAdmin, isPublisher, router, token]);

  const sidebarLinks: SidebarLink[] = [
    { key: "personal", title: "Personal Information", subtitle: "Modify your personal information", href: "/user/profile" },
    { key: "manage-accounts", title: "Manage Accounts", subtitle: "Create or edit admin/publisher accounts", href: "/user/manage-accounts" },
    { key: "manage-games", title: "Manage Games", subtitle: "Create or edit games", href: "/user/manage-games" },
    { key: "manage-promos", title: "Game Sale", subtitle: "Create and manage promo codes", href: "/user/manage-promos" },
    { key: "manage-orders", title: "Manage Orders", subtitle: "View customer purchases", href: "/user/manage-orders" },
    { key: "manage-refunds", title: "Manage Refunds", subtitle: "Review and process refunds", href: "/user/manage-refunds" },
    { key: "manage-reports", title: "Manage Reports", subtitle: "Review reported items", href: "/user/manage-reports" },
  ].filter((link) =>
    isAdmin
      ? true
      : link.key !== "manage-accounts" &&
        link.key !== "manage-orders" &&
        link.key !== "manage-refunds" &&
        link.key !== "manage-reports"
  ); // publishers don't manage accounts, refunds, or customer orders

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

  const loadPublishers = async () => {
    if (!token || !isAdmin) return;
    try {
      const res = await fetch(gameStoreApiUrl("/admin/publishers"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load publishers");
      setPublishers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPublishers();
  }, [token, isAdmin]);

  const loadGamesForPublisher = async (publisherId: string, target: "create" | "edit") => {
    if (!token) return;

    const setLoading = target === "edit" ? setEditGamesLoading : setGamesLoading;
    const setMsg = target === "edit" ? setEditGamesMsg : setGamesMsg;
    const setData = target === "edit" ? setEditGames : setGames;

    setLoading(true);
    setMsg(null);
    try {
      const url = isAdmin
        ? gameStoreApiUrl(`/admin/publishers/${publisherId}/games`)
        : gameStoreApiUrl("/publisher/games/me");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to load games");
      setData(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load games";
      setMsg({ type: "error", text: msg });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (form.scope !== "Store") return;
    // Store-wide promos are global; keep form consistent.
    if (form.publisherId || form.applicableScope !== "AllGames" || form.gameIds.length) {
      setForm((prev) => ({
        ...prev,
        publisherId: "",
        applicableScope: "AllGames",
        gameIds: [],
      }));
    }
  }, [form.scope, form.publisherId, form.applicableScope, form.gameIds.length, isAdmin]);

  useEffect(() => {
    if (form.applicableScope !== "SpecificGames") {
      if (form.gameIds.length) setForm((prev) => ({ ...prev, gameIds: [] }));
      return;
    }

    if (isAdmin && form.scope === "Store") return;

    const publisherIdForGames = isPublisher ? (user as any)?.id : form.publisherId;
    if (!publisherIdForGames) return;
    if (!/^[a-f0-9]{24}$/i.test(String(publisherIdForGames))) return;

    loadGamesForPublisher(String(publisherIdForGames), "create");
  }, [form.applicableScope, form.publisherId, isPublisher, token, user?.id]);

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

    const scope = isAdmin ? form.scope : "Publisher";
    const publisherId = isPublisher ? (user as any)?.id : form.publisherId;
    if (scope !== "Store") {
      if (!publisherId) {
        setFormMsg({ type: "error", text: "Publisher ID is required (select a publisher)." });
        return;
      }
      if (!/^[a-f0-9]{24}$/i.test(publisherId)) {
        setFormMsg({ type: "error", text: "Publisher ID must be a valid 24-character id." });
        return;
      }
    }
    if (!form.applicationCondition.trim()) {
      setFormMsg({ type: "error", text: "Condition/Value is required." });
      return;
    }
    if (!form.code.trim()) {
      setFormMsg({ type: "error", text: "Game Sale code is required." });
      return;
    }
    if (scope !== "Store" && form.applicableScope === "SpecificGames" && form.gameIds.length === 0) {
      setFormMsg({ type: "error", text: "Select at least 1 game for a Specific Games promotion." });
      return;
    }
    setSaving(true);
    setFormMsg(null);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        promotionName: form.promotionName,
        code: form.code.trim(),
        discountType: form.discountType,
        applicableScope: scope === "Store" ? ("AllGames" as const) : form.applicableScope,
        applicationCondition: form.applicationCondition.trim(),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : nowIso,
        expirationDate: form.expirationDate
          ? new Date(form.expirationDate).toISOString()
          : form.startDate
          ? new Date(form.startDate).toISOString()
          : nowIso,
        endDate: form.endDate
          ? new Date(form.endDate).toISOString()
          : form.expirationDate
          ? new Date(form.expirationDate).toISOString()
          : form.startDate
          ? new Date(form.startDate).toISOString()
          : nowIso,
        quantityIssued: Number.isFinite(form.quantityIssued) ? Math.max(0, form.quantityIssued) : 0,
        status: form.status,
        ...(scope !== "Store" ? { publisherId } : { scope: "Store" }),
        ...(scope !== "Store" && form.applicableScope === "SpecificGames" ? { gameIds: form.gameIds } : {}),
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
        const detail = data?.message || data?.error?.message || data?.error || JSON.stringify(data);
        console.error("Create promo failed", res.status, detail);
        setFormMsg({ type: "error", text: detail || "Failed to create promo." });
        return;
      }
      setFormMsg({ type: "success", text: "Game Sale created." });
      await loadPromos();
    } catch {
      setFormMsg({ type: "error", text: "Server error." });
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = async (promo: Promotion) => {
    setEditingId(promo.id);
    setEditMsg(null);
    setEditForm({
      promotionName: promo.promotionName ?? "",
      code: String(promo.code ?? promo.promotionName ?? ""),
      discountType: promo.discountType,
      applicableScope: promo.applicableScope,
      applicationCondition: promo.applicationCondition ?? "",
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : "",
      expirationDate: promo.expirationDate
        ? new Date(promo.expirationDate).toISOString().slice(0, 16)
        : "",
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : "",
      quantityIssued: promo.quantityIssued ?? 0,
      status: promo.status,
      publisherId: promo.publisherId,
      scope: (promo.scope as any) ?? "Publisher",
      gameIds: Array.isArray(promo.gameIds) ? promo.gameIds : [],
    });

    if (promo.applicableScope === "SpecificGames") {
      await loadGamesForPublisher(promo.publisherId, "edit");
    } else {
      setEditGames([]);
      setEditGamesMsg(null);
    }
  };

  const saveEdit = async () => {
    if (!token || !editingId) return;

    if (!editForm.applicationCondition.trim()) {
      setEditMsg({ type: "error", text: "Condition/Value is required." });
      return;
    }
    if (!editForm.code.trim()) {
      setEditMsg({ type: "error", text: "Game Sale code is required." });
      return;
    }
    if (editForm.scope !== "Store" && editForm.applicableScope === "SpecificGames" && editForm.gameIds.length === 0) {
      setEditMsg({ type: "error", text: "Select at least 1 game for a Specific Games promotion." });
      return;
    }

    setEditSaving(true);
    setEditMsg(null);
    try {
      const nowIso = new Date().toISOString();
      const startIso = editForm.startDate ? new Date(editForm.startDate).toISOString() : nowIso;
      const expirationIso = editForm.expirationDate ? new Date(editForm.expirationDate).toISOString() : startIso;
      const endIso = editForm.endDate ? new Date(editForm.endDate).toISOString() : expirationIso;
      const payload: any = {
        promotionName: editForm.promotionName,
        code: editForm.code.trim(),
        discountType: editForm.discountType,
        applicableScope: editForm.scope === "Store" ? "AllGames" : editForm.applicableScope,
        applicationCondition: editForm.applicationCondition.trim(),
        startDate: startIso,
        expirationDate: expirationIso,
        endDate: endIso,
        quantityIssued: Number.isFinite(editForm.quantityIssued) ? Math.max(0, editForm.quantityIssued) : 0,
        status: editForm.status,
      };

      if (editForm.scope !== "Store") {
        payload.publisherId = editForm.publisherId;
        if (editForm.applicableScope === "SpecificGames") payload.gameIds = editForm.gameIds;
      }

      const res = await fetch(gameStoreApiUrl(`/admin/promotions/${editingId}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = data?.message || data?.error?.message || data?.error || JSON.stringify(data);
        console.error("Update promo failed", res.status, detail);
        setEditMsg({ type: "error", text: detail || "Failed to update promo." });
        return;
      }

      setEditMsg({ type: "success", text: "Game Sale updated." });
      await loadPromos();
      setEditingId(null);
    } catch {
      setEditMsg({ type: "error", text: "Server error." });
    } finally {
      setEditSaving(false);
    }
  };

  const deletePromo = async (id: string) => {
    if (!token) return;
    const ok = confirm("Delete this Game Sale code?");
    if (!ok) return;
    setListMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/promotions/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail = data?.message || data?.error?.message || data?.error || JSON.stringify(data);
        throw new Error(detail || "Failed to delete promotion.");
      }
      await loadPromos();
    } catch (err) {
      setListMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to delete promotion." });
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
          {isPublisher ? (
            <PublisherAccountSidebar />
          ) : (
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
          )}

          <main className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Game Sale</h1>
                <p className="text-white/70">
                  Create and manage promo codes ({isAdmin ? "Admin" : "Publisher"}).
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
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm text-white/70">Game Sale Code</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              code: generateGameSaleCode(prev.promotionName),
                            }))
                          }
                          className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                        >
                          Generate
                        </button>
                        <button
                          type="button"
                          disabled={!form.code.trim()}
                          onClick={() => void navigator.clipboard?.writeText(form.code.trim())}
                          className={`rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white ${
                            form.code.trim() ? "hover:bg-white/10" : "opacity-60"
                          }`}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        name="code"
                        value={form.code}
                        onChange={handleChange}
                        required
                        className="input flex-1"
                        placeholder="SUMMER20"
                      />
                    </div>
                    <p className="mt-1 text-xs text-white/60">Customers apply this code at checkout.</p>
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
                  {isAdmin ? (
                    <div>
                      <label className="text-sm text-white/70">Scope</label>
                      <select
                        name="scope"
                        value={form.scope}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, scope: e.target.value as any }))
                        }
                        className="input"
                      >
                        <option value="Publisher">Publisher promo</option>
                        <option value="Store">Store-wide (all games)</option>
                      </select>
                      <p className="mt-1 text-xs text-white/60">
                        Game Sale codes are applied at checkout only.
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <label className="text-sm text-white/70">Applicable Scope</label>
                    <select
                      name="applicableScope"
                      value={form.applicableScope}
                      onChange={handleChange}
                      className="input"
                      disabled={isAdmin && form.scope === "Store"}
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
                  {isAdmin && form.scope !== "Store" ? (
                    <div className="md:col-span-2">
                      <label className="text-sm text-white/70">Publisher ID</label>
                      <div className="grid gap-2 md:grid-cols-2">
                        <select
                          value={form.publisherId}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, publisherId: e.target.value, gameIds: [] }))
                          }
                          className="input"
                        >
                          <option value="">Select publisher…</option>
                          {publishers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {(p.publisherName || p.email || p.id).toString()}
                            </option>
                          ))}
                        </select>
                        <input
                          name="publisherId"
                          value={form.publisherId}
                          onChange={handleChange}
                          required
                          className="input"
                          placeholder="Or paste publisher ObjectId"
                        />
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        Required for admin: choose which publisher owns this promo.
                      </p>
                    </div>
                  ) : isAdmin && form.scope === "Store" ? (
                    <div className="md:col-span-2">
                      <label className="text-sm text-white/70">Publisher ID</label>
                      <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/85">
                        Store-wide (no publisher)
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        Store-wide promos use a placeholder publisher id in the database.
                      </p>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="text-sm text-white/70">Publisher ID (auto)</label>
                      <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/85">
                        {(user as any)?.id || "Not available"}
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        Using the logged-in publisher account ID for promotions.
                      </p>
                    </div>
                  )}

                  {form.scope !== "Store" && form.applicableScope === "SpecificGames" ? (
                    <div className="md:col-span-2">
                      <label className="text-sm text-white/70">Applicable Games</label>
                      {gamesMsg ? (
                        <div className="mt-2 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                          {gamesMsg.text}
                        </div>
                      ) : null}
                      <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">
                        {gamesLoading ? (
                          <p className="text-sm text-white/70">Loading games…</p>
                        ) : games.length === 0 ? (
                          <p className="text-sm text-white/70">No games found for this publisher.</p>
                        ) : (
                          <div className="space-y-2">
                            {games.map((g) => {
                              const checked = form.gameIds.includes(g.id);
                              return (
                                <label
                                  key={g.id}
                                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? Array.from(new Set([...form.gameIds, g.id]))
                                        : form.gameIds.filter((id) => id !== g.id);
                                      setForm((prev) => ({ ...prev, gameIds: next }));
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-white">{g.name}</p>
                                    <p className="truncate text-xs text-white/60">{g.genre}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-white/60">
                        Select one or more games for this promotion.
                      </p>
                    </div>
                  ) : null}
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
                    {saving ? "Saving…" : "Create Game Sale"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        promotionName: "",
                        code: "",
                        discountType: "Percentage",
                        applicableScope: "AllGames",
                        applicationCondition: "",
                        startDate: "",
                        expirationDate: "",
                        endDate: "",
                        quantityIssued: 0,
                        status: "Active",
                        publisherId: "",
                        scope: "Publisher",
                        gameIds: [],
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
                  <h2 className="text-xl font-semibold">Existing Game Sale Codes</h2>
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
                  <p className="text-white/70">Loading game sales…</p>
                ) : promos.length === 0 ? (
                  <p className="text-white/70">No game sales yet.</p>
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
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                              <span>Code: {promo.code ?? promo.promotionName}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  void navigator.clipboard?.writeText(String(promo.code ?? promo.promotionName))
                                }
                                className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-semibold text-white/90 hover:bg-white/10"
                              >
                                Copy
                              </button>
                            </div>
                            <p className="text-sm text-white/70">
                              {promo.discountType} · {scopeLabel(promo.applicableScope)} ·{" "}
                              {discountLabel(promo)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                editingId === promo.id ? setEditingId(null) : beginEdit(promo)
                              }
                              className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                            >
                              {editingId === promo.id ? "Cancel" : "Edit"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePromo(promo.id)}
                              className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
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
                        </div>
                        <p className="mt-2 text-xs text-white/55">
                          Start: {new Date(promo.startDate).toLocaleString()} · Exp:{" "}
                          {new Date(promo.expirationDate).toLocaleString()}
                        </p>
                        {editingId === promo.id ? (
                          <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                            {editMsg ? (
                              <div
                                className={`rounded-lg border px-4 py-3 text-sm ${
                                  editMsg.type === "success"
                                    ? "border-green-400/40 bg-green-500/10 text-green-100"
                                    : "border-red-400/40 bg-red-500/10 text-red-100"
                                }`}
                              >
                                {editMsg.text}
                              </div>
                            ) : null}

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="md:col-span-2">
                                <label className="text-sm text-white/70">Name</label>
                                <input
                                  value={editForm.promotionName}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, promotionName: e.target.value }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <div className="flex items-center justify-between gap-3">
                                  <label className="text-sm text-white/70">Game Sale Code</label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditForm((prev) => ({
                                          ...prev,
                                          code: generateGameSaleCode(prev.promotionName),
                                        }))
                                      }
                                      className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                                    >
                                      Generate
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!editForm.code.trim()}
                                      onClick={() => void navigator.clipboard?.writeText(editForm.code.trim())}
                                      className={`rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white ${
                                        editForm.code.trim() ? "hover:bg-white/10" : "opacity-60"
                                      }`}
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <input
                                    value={editForm.code}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                                    className="input flex-1"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-sm text-white/70">Discount Type</label>
                                <select
                                  value={editForm.discountType}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      discountType: e.target.value as any,
                                    }))
                                  }
                                  className="input"
                                >
                                  <option value="Percentage">Percentage</option>
                                  <option value="FixedAmount">Fixed Amount</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-sm text-white/70">Applicable Scope</label>
                                <select
                                  value={editForm.applicableScope}
                                  onChange={async (e) => {
                                    const next = e.target.value as any;
                                    setEditForm((prev) => ({
                                      ...prev,
                                      applicableScope: next,
                                      gameIds: next === "SpecificGames" ? prev.gameIds : [],
                                    }));
                                    if (next === "SpecificGames") {
                                      await loadGamesForPublisher(editForm.publisherId, "edit");
                                    }
                                  }}
                                  className="input"
                                >
                                  <option value="AllGames">All Games</option>
                                  <option value="SpecificGames">Specific Games</option>
                                  <option value="Category">Category</option>
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-sm text-white/70">Condition / Value</label>
                                <input
                                  value={editForm.applicationCondition}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      applicationCondition: e.target.value,
                                    }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-white/70">Start Date</label>
                                <input
                                  type="datetime-local"
                                  value={editForm.startDate}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, startDate: e.target.value }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-white/70">Expiration Date</label>
                                <input
                                  type="datetime-local"
                                  value={editForm.expirationDate}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      expirationDate: e.target.value,
                                    }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-white/70">End Date</label>
                                <input
                                  type="datetime-local"
                                  value={editForm.endDate}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-white/70">Quantity Issued</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={editForm.quantityIssued}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      quantityIssued: Number(e.target.value),
                                    }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-white/70">Status</label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      status: e.target.value as any,
                                    }))
                                  }
                                  className="input"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                  <option value="Expired">Expired</option>
                                </select>
                              </div>

                              {isAdmin ? (
                                <div className="md:col-span-2">
                                  <label className="text-sm text-white/70">Publisher</label>
                                  <select
                                    value={editForm.publisherId}
                                    onChange={async (e) => {
                                      const next = e.target.value;
                                      setEditForm((prev) => ({ ...prev, publisherId: next, gameIds: [] }));
                                      if (/^[a-f0-9]{24}$/i.test(next)) {
                                        await loadGamesForPublisher(next, "edit");
                                      }
                                    }}
                                    className="input"
                                  >
                                    {publishers.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {(p.publisherName || p.email || p.id).toString()}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}

                              {editForm.applicableScope === "SpecificGames" ? (
                                <div className="md:col-span-2">
                                  <label className="text-sm text-white/70">Applicable Games</label>
                                  {editGamesMsg ? (
                                    <div className="mt-2 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                                      {editGamesMsg.text}
                                    </div>
                                  ) : null}
                                  <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">
                                    {editGamesLoading ? (
                                      <p className="text-sm text-white/70">Loading games…</p>
                                    ) : editGames.length === 0 ? (
                                      <p className="text-sm text-white/70">No games found for this publisher.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {editGames.map((g) => {
                                          const checked = editForm.gameIds.includes(g.id);
                                          return (
                                            <label
                                              key={g.id}
                                              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                  const next = e.target.checked
                                                    ? Array.from(new Set([...editForm.gameIds, g.id]))
                                                    : editForm.gameIds.filter((id) => id !== g.id);
                                                  setEditForm((prev) => ({ ...prev, gameIds: next }));
                                                }}
                                              />
                                              <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{g.name}</p>
                                                <p className="truncate text-xs text-white/60">{g.genre}</p>
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={editSaving}
                                className="rounded-xl bg-[#1b1a55] px-5 py-3 text-sm font-semibold text-white hover:bg-[#23225e] transition disabled:opacity-60"
                              >
                                {editSaving ? "Saving…" : "Save Changes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
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
