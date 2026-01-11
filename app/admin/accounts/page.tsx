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

  const [customers, setCustomers] = useState<any[]>([]);
  const [publishers, setPublishers] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listMsg, setListMsg] = useState<Message>(null);

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
        setCustomers(Array.isArray(custData) ? custData : []);
        setPublishers(Array.isArray(pubData) ? pubData : []);
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
      title: "Manage Promo Codes",
      subtitle: "Create and manage promotions",
      href: "/user/manage-promos",
    },
    {
      key: "manage-orders",
      title: "Manage Orders",
      subtitle: "View customer purchases",
      href: "/user/manage-orders",
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
                            <th className="px-3 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-white/70" colSpan={5}>
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
                                <td className="px-3 py-2 text-right">
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
