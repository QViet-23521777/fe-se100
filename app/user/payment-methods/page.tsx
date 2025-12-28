"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/app/context/AuthContext";

const logo = "/assets/figma-logo.svg";
const socials = [
  "/assets/figma-social-28-2108.svg",
  "/assets/figma-social-28-2109.svg",
  "/assets/figma-social-28-2110.svg",
  "/assets/figma-social-28-2111.svg",
];

const paymentLogos = {
  visa: "/assets/0330a8b8c36763d74b8be98cbac253ef243e8163.png",
  paypal: "/assets/49b272b182ca363870ee17abeb3516cd9b20eb52.png",
} as const;

type PaymentMethodType = keyof typeof paymentLogos;

type PaymentMethod = {
  id: string;
  type: PaymentMethodType;
  label: string;
};

type Message = { type: "success" | "error" | "info"; text: string };

const STORAGE_KEY = "gameverse_payment_methods_v1";

function readMethods(): PaymentMethod[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PaymentMethod[];
  } catch {
    return [];
  }
}

function writeMethods(methods: PaymentMethod[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
  } catch {
    // ignore write errors
  }
}

function defaultMethods(): PaymentMethod[] {
  return [
    { id: "visa_default", type: "visa", label: "•••• •••• •••• 1234" },
    { id: "paypal_default", type: "paypal", label: "Paypal" },
  ];
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  );
}

function AccountSidebarItem({
  title,
  subtitle,
  href,
  active,
}: {
  title: string;
  subtitle: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative block px-6 py-5 transition ${
        active ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      {active ? (
        <>
          <span className="absolute left-0 top-0 h-full w-[3px] bg-white/20" />
          <span className="absolute right-0 top-0 h-full w-[3px] bg-white/20" />
        </>
      ) : null}
      <p className={`text-lg font-semibold ${active ? "text-white/75" : "text-white"}`}>
        {title}
      </p>
      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
    </Link>
  );
}

function PaymentMethodRow({
  method,
  onRemove,
  onEdit,
}: {
  method: PaymentMethod;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-[86px] items-center justify-center rounded-[12px] bg-white shadow-sm">
          <img
            src={paymentLogos[method.type]}
            alt={method.type}
            className="h-7 object-contain"
            loading="lazy"
          />
        </div>
        <p className="text-sm font-semibold text-white sm:text-base">{method.label}</p>
      </div>

      <div className="flex items-center gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => onRemove(method.id)}
          className="h-10 w-[120px] rounded-full bg-white text-sm font-semibold text-[#1b1a55]"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={() => onEdit(method.id)}
          className="h-10 w-[120px] rounded-full border border-white/50 text-sm font-semibold text-white hover:bg-white/5"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function AddMethodRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-between rounded-[10px] border border-white/25 bg-white/5 px-4 text-left text-sm text-white/90 hover:border-white/40"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center text-white/80">
          {icon}
        </span>
        <span>{label}</span>
      </span>
      <ChevronDownIcon className="h-4 w-4 text-white/60" />
    </button>
  );
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token)
      router.replace(`/user/login?next=${encodeURIComponent("/user/payment-methods")}`);
  }, [mounted, router, token]);

  useEffect(() => {
    if (!mounted) return;
    const stored = readMethods();
    const initial = stored.length ? stored : defaultMethods();
    setMethods(initial);
    if (stored.length === 0) writeMethods(initial);
  }, [mounted]);

  function removeMethod(id: string) {
    setMessage(null);
    setMethods((prev) => {
      const next = prev.filter((m) => m.id !== id);
      writeMethods(next);
      return next;
    });
    setMessage({ type: "success", text: "Payment method removed." });
  }

  function editMethod(id: string) {
    setMessage(null);
    const target = methods.find((m) => m.id === id);
    if (!target) return;
    if (target.type === "paypal") {
      setMessage({ type: "info", text: "PayPal settings are coming soon." });
      return;
    }

    const last4 = window.prompt("Update card last 4 digits:", "1234")?.trim() ?? "";
    const normalized = last4.replace(/\D/g, "").slice(0, 4);
    if (!normalized) return;

    setMethods((prev) => {
      const next = prev.map((m) =>
        m.id === id ? { ...m, label: `•••• •••• •••• ${normalized}` } : m
      );
      writeMethods(next);
      return next;
    });
    setMessage({ type: "success", text: "Payment method updated." });
  }

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/70 shadow-xl">
            Loading payment methods…
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/70 shadow-xl">
            Redirecting to login…
          </div>
        </div>
      </div>
    );
  }

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
              <AccountSidebarItem
                title="Personal Information"
                subtitle="Modify Your Personal Information"
                href="/user/profile"
              />
              <AccountSidebarItem
                title="My Orders"
                subtitle="View Your Previous Orders"
                href="/user/orders"
              />
              <AccountSidebarItem
                title="Wishlist"
                subtitle="View Games You Added in Wishlist"
                href="/wishlist"
              />
              <AccountSidebarItem
                title="Payment Methods"
                subtitle="Adjust Your Payment Method"
                href="/user/payment-methods"
                active
              />
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl backdrop-blur">
            {message ? (
              <div
                className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                    : message.type === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-100"
                      : "border-white/10 bg-white/5 text-white/80"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[20px] bg-[#1b1a55]/65 shadow-xl">
              <div className="divide-y divide-white/10 px-6">
                {methods.map((method) => (
                  <PaymentMethodRow
                    key={method.id}
                    method={method}
                    onRemove={removeMethod}
                    onEdit={editMethod}
                  />
                ))}
              </div>

              <div className="space-y-4 border-t border-white/10 px-6 pb-6 pt-6">
                <p className="text-lg font-semibold text-white">Add a payment method</p>
                <div className="space-y-3">
                  <AddMethodRow
                    icon={<CardIcon className="h-5 w-5" />}
                    label="Credit Card / Debit Card"
                    onClick={() =>
                      setMessage({
                        type: "info",
                        text: "Adding new cards is coming soon.",
                      })
                    }
                  />
                  <AddMethodRow
                    icon={
                      <img
                        src={paymentLogos.paypal}
                        alt="PayPal"
                        className="h-5 w-5 object-contain"
                      />
                    }
                    label="PayPal"
                    onClick={() =>
                      setMessage({
                        type: "info",
                        text: "Linking PayPal is coming soon.",
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </main>
        </div>

        <footer className="mt-6 space-y-6 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="GameVerse" className="h-10 w-10" />
              <span className="text-xl font-semibold">GameVerse</span>
            </div>
            <div className="space-y-2 max-w-xl text-sm text-white/80">
              GameVerse — Where every gamer levels up! From epic AAA adventures to indie
              gems, grab the hottest deals on PC, Xbox, PlayStation & Nintendo. Play
              more, pay less.
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">My Account</p>
                <Link href="/user/account" className="block text-white/80">
                  My Account
                </Link>
                <Link href="/user/orders" className="block text-white/80">
                  My Orders
                </Link>
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">Support</p>
                <Link href="/terms" className="block text-white/80">
                  Terms and conditions
                </Link>
                <Link href="/privacy" className="block text-white/80">
                  Privacy and cookie policy
                </Link>
                <Link href="/refunds" className="block text-white/80">
                  Refund policy
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <p className="text-sm text-white/70">
              Copyright GameVerse.com 2025, all rights reserved
            </p>
            <div className="flex items-center gap-3">
              {socials.map((icon) => (
                <img key={icon} src={icon} alt="social" className="h-8 w-8" loading="lazy" />
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
