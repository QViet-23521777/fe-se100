"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";

type Message = { type: "error" | "success"; text: string } | null;

type SidebarLink = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
};

type CustomerAccountRow = {
  id: string;
  email: string;
  username?: string;
  name?: string;
  phoneNumber?: string;
  accountStatus?: string;
  accountBalance?: number;
};

type PublisherAccountRow = {
  id: string;
  email: string;
  publisherName?: string;
  name?: string;
  phoneNumber?: string;
  activityStatus?: string;
};

function SidebarItem({ item, active }: { item: SidebarLink; active?: boolean }) {
  return (
    <Link
      href={item.href}
      className={`block px-6 py-5 transition ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <p className="text-lg font-semibold text-white">{item.title}</p>
      <p className="mt-1 text-sm text-white/55">{item.subtitle}</p>
    </Link>
  );
}

export default function AdminAccountsPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [customers, setCustomers] = useState<CustomerAccountRow[]>([]);
  const [publishers, setPublishers] = useState<PublisherAccountRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listMsg, setListMsg] = useState<Message>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupCustomer, setTopupCustomer] = useState<CustomerAccountRow | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupMsg, setTopupMsg] = useState<Message>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [lockLoadingId, setLockLoadingId] = useState<string | null>(null);
  const [lockLoadingType, setLockLoadingType] = useState<"customer" | "publisher" | null>(null);

  const [pubForm, setPubForm] = useState({
    publisherName: "",
    email: "",
    phoneNumber: "",
    password: "",
    contractDate: "",
    contractDuration: 1,
    bankType: "",
    bankName: "",
  });
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
    phoneNumber: "",
    role: "Admin", // single allowed role
  });

  const [pubMsg, setPubMsg] = useState<Message>(null);
  const [admMsg, setAdmMsg] = useState<Message>(null);
  const [loadingPub, setLoadingPub] = useState(false);
  const [loadingAdm, setLoadingAdm] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      router.replace("/admin/login");
      return;
    }
    if (user.accountType !== "admin") {
      router.replace("/admin/login");
    }
  }, [router, token, user]);

  useEffect(() => {
    if (!token || user?.accountType !== "admin") return;
    let active = true;
    const load = async () => {
      setLoadingList(true);
      setListMsg(null);
      try {
        const [custRes, pubRes] = await Promise.all([
          fetch(gameStoreApiUrl("/admin/customers"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(gameStoreApiUrl("/admin/publishers"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);
        const custData = await custRes.json().catch(() => null);
        const pubData = await pubRes.json().catch(() => null);
        if (!custRes.ok) throw new Error(custData?.message || "Failed to load customers");
        if (!pubRes.ok) throw new Error(pubData?.message || "Failed to load publishers");
        if (!active) return;
        setCustomers(Array.isArray(custData) ? (custData as CustomerAccountRow[]) : []);
        setPublishers(Array.isArray(pubData) ? (pubData as PublisherAccountRow[]) : []);
      } catch (err) {
        if (!active) return;
        setListMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to load accounts" });
      } finally {
        if (active) setLoadingList(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [router, token, user]);

  const handlePubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPubForm((prev) => ({ ...prev, [name]: name === "contractDuration" ? Number(value) : value }));
  };
  const handleAdmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  };

  const createPublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    setPubMsg(null);
    setLoadingPub(true);
    try {
      const res = await fetch(gameStoreApiUrl("/admin/publishers"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pubForm),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPubMsg({ type: "error", text: data?.message || "Failed to create publisher." });
        return;
      }
      setPubMsg({ type: "success", text: "Publisher created successfully." });
    } catch {
      setPubMsg({ type: "error", text: "Server error." });
    } finally {
      setLoadingPub(false);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdmMsg(null);
    setLoadingAdm(true);
    try {
      const res = await fetch(gameStoreApiUrl("/admin/admins"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: adminForm.email,
          password: adminForm.password,
          phoneNumber: adminForm.phoneNumber,
          role: adminForm.role || "Admin",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAdmMsg({ type: "error", text: data?.message || "Failed to create admin." });
        return;
      }
      setAdmMsg({ type: "success", text: "Admin created successfully." });
    } catch {
      setAdmMsg({ type: "error", text: "Server error." });
    } finally {
      setLoadingAdm(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/customers/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete customer");
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setListMsg({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
    }
  };

  const deletePublisher = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/publishers/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete publisher");
      setPublishers((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setListMsg({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
    }
  };

  const toggleCustomerLock = async (customer: CustomerAccountRow) => {
    if (!token) return;
    const current = String(customer.accountStatus || "Active");
    const next = current === "Active" ? "Inactive" : "Active";
    const actionLabel = next === "Inactive" ? "lock" : "unlock";
    if (!confirm(`Are you sure you want to ${actionLabel} this customer account?`)) return;

    setLockLoadingId(customer.id);
    setLockLoadingType("customer");
    setListMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/customers/${customer.id}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update customer status");

      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, accountStatus: next } : c)));
      setListMsg({ type: "success", text: `Customer account ${next === "Inactive" ? "locked" : "unlocked"}.` });
    } catch (err) {
      setListMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update customer status" });
    } finally {
      setLockLoadingId(null);
      setLockLoadingType(null);
    }
  };

  const togglePublisherLock = async (publisher: PublisherAccountRow) => {
    if (!token) return;
    const current = String(publisher.activityStatus || "Active");
    const next = current === "Active" ? "Inactive" : "Active";
    const actionLabel = next === "Inactive" ? "lock" : "unlock";
    if (!confirm(`Are you sure you want to ${actionLabel} this publisher account?`)) return;

    setLockLoadingId(publisher.id);
    setLockLoadingType("publisher");
    setListMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/publishers/${publisher.id}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ activityStatus: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Failed to update publisher status");

      setPublishers((prev) => prev.map((p) => (p.id === publisher.id ? { ...p, activityStatus: next } : p)));
      setListMsg({ type: "success", text: `Publisher account ${next === "Inactive" ? "locked" : "unlocked"}.` });
    } catch (err) {
      setListMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update publisher status" });
    } finally {
      setLockLoadingId(null);
      setLockLoadingType(null);
    }
  };

  const formatUsd = (value: unknown) => {
    const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return `$${num.toFixed(2)}`;
  };

  const openTopup = (customer: CustomerAccountRow) => {
    setTopupCustomer(customer);
    setTopupAmount("");
    setTopupMsg(null);
    setTopupOpen(true);
  };

  const submitTopup = async () => {
    if (!token) return;
    if (!topupCustomer?.id) return;

    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopupMsg({ type: "error", text: "Enter a valid amount (e.g., 10 or 25.50)." });
      return;
    }

    setTopupLoading(true);
    setTopupMsg(null);
    try {
      const res = await fetch(gameStoreApiUrl(`/admin/customers/${topupCustomer.id}/wallet/topup`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to top up wallet.");
      }

      const updated = (data ?? {}) as Partial<CustomerAccountRow>;
      setCustomers((prev) => prev.map((c) => (c.id === topupCustomer.id ? { ...c, ...updated } : c)));
      setTopupCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
      setTopupMsg({ type: "success", text: `Wallet topped up by ${formatUsd(amount)}.` });
      setTopupAmount("");
    } catch (err) {
      setTopupMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to top up wallet." });
    } finally {
      setTopupLoading(false);
    }
  };

  const sidebarLinks: SidebarLink[] = [
    {
      key: "personal",
      title: "Personal Information",
      subtitle: "Modify your personal information",
      href: "/user/profile",
    },
    {
      key: "manage-accounts",
      title: "Manage Accounts",
      subtitle: "Create or edit admin/publisher accounts",
      href: "/user/manage-accounts",
    },
    {
      key: "manage-games",
      title: "Manage Games",
      subtitle: "Create or edit games",
      href: "/user/manage-games",
    },
    {
      key: "promos",
      title: "Game Sale",
      subtitle: "Create and manage promo codes",
      href: "/user/manage-promos",
    },
    {
      key: "manage-orders",
      title: "Manage Orders",
      subtitle: "View customer purchases",
      href: "/user/manage-orders",
    },
    {
      key: "manage-refunds",
      title: "Manage Refunds",
      subtitle: "Review and process refunds",
      href: "/user/manage-refunds",
    },
    {
      key: "manage-reports",
      title: "Manage Reports",
      subtitle: "Review reported items",
      href: "/user/manage-reports",
    },
  ];

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
                <SidebarItem key={item.key} item={item} active={item.key === "manage-accounts"} />
              ))}
            </div>
            <div className="px-6 py-6">
              <button
                type="button"
                onClick={() => router.push("/user/logout")}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold">Admin Account Management</h1>
                <p className="text-white/70">Create publisher and admin accounts (admin only).</p>
              </div>
              <Link
                href="/user/account"
                className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Back to Account
              </Link>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl">
                <h2 className="text-2xl font-semibold mb-4">Create Publisher</h2>
                <form className="space-y-3" onSubmit={createPublisher}>
                  <input className="input" name="publisherName" placeholder="Publisher Name" value={pubForm.publisherName} onChange={handlePubChange} required />
                  <input className="input" name="email" type="email" placeholder="Email" value={pubForm.email} onChange={handlePubChange} required />
                  <input className="input" name="phoneNumber" placeholder="Phone Number" value={pubForm.phoneNumber} onChange={handlePubChange} required />
                  <input className="input" name="password" type="password" placeholder="Password" value={pubForm.password} onChange={handlePubChange} required />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input" name="contractDate" type="date" placeholder="Contract Date" value={pubForm.contractDate} onChange={handlePubChange} required />
                    <input className="input" name="contractDuration" type="number" min={1} placeholder="Contract Duration (years)" value={pubForm.contractDuration} onChange={handlePubChange} required />
                  </div>
                  <input className="input" name="bankType" placeholder="Bank Type" value={pubForm.bankType} onChange={handlePubChange} />
                  <input className="input" name="bankName" placeholder="Bank Name" value={pubForm.bankName} onChange={handlePubChange} />
                  {pubMsg ? (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${pubMsg.type === "success" ? "border-green-400/40 bg-green-500/10 text-green-100" : "border-red-400/40 bg-red-500/10 text-red-100"}`}>
                      {pubMsg.text}
                    </div>
                  ) : null}
                  <button type="submit" disabled={loadingPub} className="w-full rounded-[10px] bg-[#1b1a55] px-4 py-3 font-semibold hover:bg-[#23225e] transition disabled:opacity-60">
                    {loadingPub ? "Creating..." : "Create Publisher"}
                  </button>
                </form>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl">
                <h2 className="text-2xl font-semibold mb-4">Create Admin</h2>
                <form className="space-y-3" onSubmit={createAdmin}>
                  <input className="input" name="email" type="email" placeholder="Email" value={adminForm.email} onChange={handleAdmChange} required />
                  <input className="input" name="password" type="password" placeholder="Password" value={adminForm.password} onChange={handleAdmChange} required />
                  <input className="input" name="phoneNumber" placeholder="Phone Number" value={adminForm.phoneNumber} onChange={handleAdmChange} required />
                  <input
                    type="hidden"
                    name="role"
                    value="Admin"
                    readOnly
                  />
                  <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-white/80 border border-white/10">
                    Role: <span className="font-semibold">Admin</span> (only)
                  </div>
                  {admMsg ? (
                    <div className={`rounded-lg border px-4 py-3 text-sm ${admMsg.type === "success" ? "border-green-400/40 bg-green-500/10 text-green-100" : "border-red-400/40 bg-red-500/10 text-red-100"}`}>
                      {admMsg.text}
                    </div>
                  ) : null}
                  <button type="submit" disabled={loadingAdm} className="w-full rounded-[10px] bg-[#1b1a55] px-4 py-3 font-semibold hover:bg-[#23225e] transition disabled:opacity-60">
                    {loadingAdm ? "Creating..." : "Create Admin"}
                  </button>
                </form>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0c143d]/70 p-6 shadow-xl mt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Accounts</h2>
                <button
                  type="button"
                  onClick={() => location.reload()}
                  className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Refresh
                </button>
              </div>
              {listMsg ? (
                <div
                  className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                    listMsg.type === "success"
                      ? "border-green-400/40 bg-green-500/10 text-green-100"
                      : "border-red-400/40 bg-red-500/10 text-red-100"
                  }`}
                >
                  {listMsg.text}
                </div>
              ) : null}
              {loadingList ? (
                <p className="text-white/70">Loading accounts…</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Publishers</h3>
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="min-w-full text-sm">
                        <thead className="bg-white/10 text-white/80">
                          <tr>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Phone</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {publishers.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-white/70" colSpan={5}>
                                No publishers
                              </td>
                            </tr>
                          ) : (
                            publishers.map((p) => (
                              <tr key={p.id} className="border-t border-white/5">
                                <td className="px-3 py-2">{p.publisherName || p.name || "—"}</td>
                                <td className="px-3 py-2">{p.email}</td>
                                <td className="px-3 py-2">{p.phoneNumber || "—"}</td>
                                <td className="px-3 py-2">{p.activityStatus || "—"}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => togglePublisherLock(p)}
                                    disabled={lockLoadingType === "publisher" && lockLoadingId === p.id}
                                    className={`mr-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                                      String(p.activityStatus || "Active") === "Active"
                                        ? "border-amber-400/60 text-amber-200 hover:bg-amber-500/10"
                                        : "border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/10"
                                    } ${lockLoadingType === "publisher" && lockLoadingId === p.id ? "opacity-60" : ""}`}
                                  >
                                    {lockLoadingType === "publisher" && lockLoadingId === p.id
                                      ? "Saving..."
                                      : String(p.activityStatus || "Active") === "Active"
                                        ? "Lock"
                                        : "Unlock"}
                                  </button>
                                  <button
                                    onClick={() => deletePublisher(p.id)}
                                    className="rounded-full border border-red-400/60 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Customers</h3>
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="min-w-full text-sm">
                        <thead className="bg-white/10 text-white/80">
                          <tr>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Phone</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Wallet</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-white/70" colSpan={6}>
                                No customers
                              </td>
                            </tr>
                          ) : (
                            customers.map((c) => (
                              <tr key={c.id} className="border-t border-white/5">
                                <td className="px-3 py-2">{c.username || c.name || "—"}</td>
                                <td className="px-3 py-2">{c.email}</td>
                                <td className="px-3 py-2">{c.phoneNumber || "—"}</td>
                                <td className="px-3 py-2">{c.accountStatus || "—"}</td>
                                <td className="px-3 py-2">{formatUsd(c.accountBalance)}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => openTopup(c)}
                                    className="mr-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                                  >
                                    Top up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleCustomerLock(c)}
                                    disabled={lockLoadingType === "customer" && lockLoadingId === c.id}
                                    className={`mr-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                                      String(c.accountStatus || "Active") === "Active"
                                        ? "border-amber-400/60 text-amber-200 hover:bg-amber-500/10"
                                        : "border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/10"
                                    } ${lockLoadingType === "customer" && lockLoadingId === c.id ? "opacity-60" : ""}`}
                                  >
                                    {lockLoadingType === "customer" && lockLoadingId === c.id
                                      ? "Saving..."
                                      : String(c.accountStatus || "Active") === "Active"
                                        ? "Lock"
                                        : "Unlock"}
                                  </button>
                                  <button
                                    onClick={() => deleteCustomer(c.id)}
                                    className="rounded-full border border-red-400/60 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {topupOpen ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c143d] p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-lg font-semibold">Top up customer wallet</p>
                            <p className="mt-1 truncate text-sm text-white/70">
                              {topupCustomer?.email || topupCustomer?.username || topupCustomer?.id || "Customer"}
                            </p>
                            <p className="mt-1 text-xs text-white/60">
                              Current balance: {formatUsd(topupCustomer?.accountBalance)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTopupOpen(false);
                              setTopupCustomer(null);
                              setTopupAmount("");
                              setTopupMsg(null);
                            }}
                            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                          >
                            Close
                          </button>
                        </div>

                        <div className="mt-5 space-y-3">
                          <label className="block text-sm text-white/70">Amount (USD)</label>
                          <input
                            className="input"
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={topupAmount}
                            onChange={(e) => setTopupAmount(e.target.value)}
                            placeholder="10.00"
                          />

                          {topupMsg ? (
                            <div
                              className={`rounded-lg border px-4 py-3 text-sm ${
                                topupMsg.type === "success"
                                  ? "border-green-400/40 bg-green-500/10 text-green-100"
                                  : "border-red-400/40 bg-red-500/10 text-red-100"
                              }`}
                            >
                              {topupMsg.text}
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={submitTopup}
                              disabled={topupLoading}
                              className="rounded-xl bg-[#1b1a55] px-5 py-3 text-sm font-semibold text-white hover:bg-[#23225e] transition disabled:opacity-60"
                            >
                              {topupLoading ? "Topping up..." : "Top up wallet"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTopupOpen(false);
                                setTopupCustomer(null);
                                setTopupAmount("");
                                setTopupMsg(null);
                              }}
                              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
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
