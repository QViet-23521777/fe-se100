"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { TopBar } from "@/components/TopBar";
import { useStore, type CartLine } from "@/app/context/StoreContext";
import { useAuth } from "@/app/context/AuthContext";
import { gameStoreApiUrl } from "@/lib/game-store-api";
import type { PaymentBrand } from "@/lib/orders";

type CardInfo = {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
};

type Message = { type: "error" | "success"; text: string };

const initialCard: CardInfo = { holder: "", number: "", expiry: "", cvv: "" };
const savedVisa = "**** **** **** 1234";

const gallery = [
  "/assets/41257b534936f9a3c9376f415acb8f44d64be4bd.png",
  "/assets/82dbcac61b11c77ced4b7b8e01436a85748c7432.png",
  "/assets/ade3f8374a32d9c832eed8e7c34accadfdc86d87.png",
  "/assets/05d783cce6ca28a9bb202198b4b629201043fd0e.png",
  "/assets/ab5db46fa48ae418fb1e714c94f7d5a69398dd91.png",
  "/assets/c13a55725563ccfca7427c9cdd090efa824d66b8.png",
];

const logo = "/assets/figma-logo.svg";
const socials = [
  "/assets/figma-social-28-2108.svg",
  "/assets/figma-social-28-2109.svg",
  "/assets/figma-social-28-2110.svg",
  "/assets/figma-social-28-2111.svg",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { cart, subtotalCents, clearCart, promoCode, promoPreview, promoError } = useStore();
  const subtotal = subtotalCents / 100;
  const discountCents = promoPreview?.discountCents ?? 0;
  const totalCents = promoPreview?.totalCents ?? subtotalCents;
  const total = totalCents / 100;

  const [mounted, setMounted] = useState(false);
  const [method, setMethod] = useState<PaymentBrand>("visa");
  const [card, setCard] = useState<CardInfo>(initialCard);
  const [message, setMessage] = useState<Message | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) router.replace(`/user/login?next=${encodeURIComponent("/checkout")}`);
  }, [mounted, router, token]);

  const canConfirm = cart.length > 0 && !processing;
  const isCard = method !== "paypal";

  const handleConfirm = async () => {
    setMessage(null);
    if (cart.length === 0) {
      setMessage({ type: "error", text: "Your cart is empty." });
      return;
    }
    if (!token) {
      router.replace(`/user/login?next=${encodeURIComponent("/checkout")}`);
      return;
    }

    if (isCard) {
      const number = digitsOnly(card.number);
      if (!card.holder.trim()) {
        setMessage({ type: "error", text: "Enter the card holder name." });
        return;
      }
      if (!luhnCheck(number)) {
        setMessage({ type: "error", text: "Card number looks invalid." });
        return;
      }
      if (!isValidExpiry(card.expiry)) {
        setMessage({ type: "error", text: "Expiry must be in the future (MM/YY)." });
        return;
      }
      if (card.cvv.trim().length < 3 || card.cvv.trim().length > 4) {
        setMessage({ type: "error", text: "CVV must be 3-4 digits." });
        return;
      }
    }

    setProcessing(true);

    try {
      const paymentMethod =
        method === "paypal" ? ("PayPal" as const) : ("CreditCard" as const);

      const items = cart.map((line) => ({
        steamAppId: typeof line.steamAppId === "number" ? line.steamAppId : undefined,
        slug: line.slug ?? undefined,
        name: line.name,
        quantity: line.quantity,
        unitPriceCents: typeof line.unitPriceCents === "number" ? line.unitPriceCents : 0,
        image: line.image,
      }));

      const url = gameStoreApiUrl("/customers/me/orders");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethod,
          items,
          promoCode: promoCode.trim() ? promoCode.trim() : undefined,
        }),
      });

      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        const text =
          data?.error?.message || data?.message || "Payment failed. Please try again.";
        if (
          res.status === 404 &&
          typeof text === "string" &&
          text.toLowerCase().includes('post /customers/me/orders') &&
          text.toLowerCase().includes("not found")
        ) {
          throw new Error(
            `Your backend does not have the purchase endpoint yet. Restart \`game-store-api\` after pulling the latest code, then retry.\n\nTried: ${url}`
          );
        }
        throw new Error(text);
      }

      clearCart();
      setMessage({ type: "success", text: "Payment successful! Redirecting..." });

      const orderId = typeof data?.id === "string" ? data.id : null;
      const href = orderId ? `/user/orders?new=1#${encodeURIComponent(orderId)}` : "/user/orders?new=1";

      setTimeout(() => {
        router.push(href);
      }, 500);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Payment failed. Please try again.",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-6 text-white/70 shadow-xl">
            Loading checkout…
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
      <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <h1 className="text-4xl font-bold">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-6">
            <PaymentSection
              method={method}
              card={card}
              onSelectMethod={setMethod}
              onCardChange={setCard}
              isCard={isCard}
              onUseSavedVisa={() => {
                setMethod("visa");
                setCard((prev) => ({ ...prev, number: savedVisa }));
              }}
              onUsePaypal={() => setMethod("paypal")}
            />
            <Gallery />
          </div>

          <OrderSummary
            subtotal={subtotal}
            discount={discountCents / 100}
            total={total}
            canConfirm={canConfirm}
            processing={processing}
            onConfirm={handleConfirm}
            cart={cart}
            promoError={promoError}
            message={message}
          />
        </div>

        <Footer />
      </div>
    </div>
  );
}

function PaymentSection({
  method,
  card,
  onSelectMethod,
  onCardChange,
  isCard,
  onUseSavedVisa,
  onUsePaypal,
}: {
  method: PaymentBrand;
  card: CardInfo;
  onSelectMethod: (m: PaymentBrand) => void;
  onCardChange: (card: CardInfo) => void;
  isCard: boolean;
  onUseSavedVisa: () => void;
  onUsePaypal: () => void;
}) {
  const handleInput = (key: keyof CardInfo) => (value: string) => {
    onCardChange({ ...card, [key]: value });
  };

  return (
    <div className="space-y-6 rounded-[20px] bg-gradient-to-b from-white/10 to-black/15 p-6 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Payment Method</h2>
        <span className="text-sm text-white/70">
          {method === "paypal" ? "No card required" : "Secure card payment"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PaymentCard brand="visa" active={method === "visa"} onSelect={onSelectMethod} />
        <PaymentCard
          brand="mastercard"
          active={method === "mastercard"}
          onSelect={onSelectMethod}
        />
        <PaymentCard brand="paypal" active={method === "paypal"} onSelect={onSelectMethod} />
        <PaymentCard
          brand="payoneer"
          active={method === "payoneer"}
          onSelect={onSelectMethod}
        />
      </div>

      <div className="space-y-4">
        <Input
          placeholder="Card Holder Name"
          value={card.holder}
          onChange={handleInput("holder")}
          disabled={!isCard}
        />
        <Input
          placeholder="Card Number"
          value={card.number}
          onChange={(val) => handleInput("number")(val.replace(/[^\d\s*]/g, ""))}
          disabled={!isCard}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            placeholder="Expiry Date (MM/YY)"
            value={card.expiry}
            onChange={handleInput("expiry")}
            disabled={!isCard}
          />
          <Input
            placeholder="CVV"
            value={card.cvv}
            onChange={(val) => handleInput("cvv")(digitsOnly(val).slice(0, 4))}
            disabled={!isCard}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-[12px] border border-white/10 bg-white/5 p-4 text-sm text-white/80">
        <p className="text-white font-semibold">Saved methods</p>
        <div className="flex flex-wrap gap-3">
          <SavedCard brand="visa" number={savedVisa} onUse={onUseSavedVisa} />
          <SavedCard brand="paypal" number="PayPal" onUse={onUsePaypal} />
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <div className="space-y-3 rounded-[20px] bg-transparent">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
          Г-
        </div>
        <span className="text-sm text-white/80">Trailer & Screenshots</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1a55] text-white">
          Г?1
        </button>
        {gallery.map((src) => (
          <img
            key={src}
            src={src}
            alt="shot"
            className="h-24 w-28 rounded-lg object-cover opacity-80 transition hover:opacity-100"
            loading="lazy"
          />
        ))}
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1a55] text-white">
          Г?з
        </button>
      </div>
    </div>
  );
}

function OrderSummary({
  subtotal,
  discount,
  total,
  canConfirm,
  processing,
  onConfirm,
  cart,
  promoError,
  message,
}: {
  subtotal: number;
  discount: number;
  total: number;
  canConfirm: boolean;
  processing: boolean;
  onConfirm: () => void;
  cart: CartLine[];
  promoError?: string | null;
  message: Message | null;
}) {
  return (
    <aside className="space-y-4 rounded-[18px] bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl">
      <h2 className="text-2xl font-semibold">Order Summary</h2>
      <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
      <SummaryRow label="Discount" value={discount > 0 ? `-$${discount.toFixed(2)}` : "$0.00"} />
      <div className="h-px w-full bg-white/20" />
      <div className="flex items-center justify-between text-xl font-semibold">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>

      <div className="rounded-[12px] border border-white/10 bg-white/5 p-4 text-sm text-white/80">
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul className="space-y-2">
            {cart.slice(0, 4).map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-white/85">{line.name}</span>
                <span className="font-martian-mono text-xs text-white/70">
                  {line.quantity} × {line.priceLabel ?? "$--"}
                </span>
              </li>
            ))}
            {cart.length > 4 ? (
              <li className="text-xs text-white/60">+ {cart.length - 4} more items</li>
            ) : null}
          </ul>
        )}
      </div>

      {promoError ? (
        <div className="rounded-[10px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {promoError}
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-[10px] border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm}
        className={`w-full rounded-[12px] bg-[#1b1a55] px-4 py-3 text-center text-sm font-semibold ${
          canConfirm ? "hover:bg-[#24205f]" : "cursor-not-allowed opacity-50"
        }`}
      >
        {processing ? "Processing..." : "Confirm Payment"}
      </button>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-base text-white/80">
      <span>{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function PaymentCard({
  brand,
  active,
  onSelect,
}: {
  brand: PaymentBrand;
  active?: boolean;
  onSelect: (brand: PaymentBrand) => void;
}) {
  const logos: Record<PaymentBrand, string> = {
    visa: "/assets/0330a8b8c36763d74b8be98cbac253ef243e8163.png",
    mastercard: "/assets/0edf57aebdd94b78202290f6dcae0459bfe5b4b4.png",
    paypal: "/assets/49b272b182ca363870ee17abeb3516cd9b20eb52.png",
    payoneer: "/assets/5abc0e55a1382777afdb381f51650108b607c589.png",
  };
  return (
    <button
      type="button"
      onClick={() => onSelect(brand)}
      className={`flex h-20 items-center justify-center rounded-[12px] border border-white/20 bg-white transition ${
        active ? "shadow-lg" : "opacity-60 hover:opacity-100"
      }`}
    >
      <img src={logos[brand]} alt={brand} className="h-8 object-contain" />
    </button>
  );
}

function SavedCard({
  brand,
  number,
  onUse,
}: {
  brand: PaymentBrand | "paypal";
  number: string;
  onUse: () => void;
}) {
  const label = brand === "paypal" ? "PayPal" : number;
  const logo =
    brand === "paypal"
      ? "/assets/49b272b182ca363870ee17abeb3516cd9b20eb52.png"
      : "/assets/0330a8b8c36763d74b8be98cbac253ef243e8163.png";
  return (
    <button
      type="button"
      onClick={onUse}
      className="flex items-center gap-3 rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition hover:border-white/30"
    >
      <div className="flex h-12 w-16 items-center justify-center rounded-[8px] bg-white">
        <img src={logo} alt={brand} className="h-7 object-contain" />
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-white">{label}</p>
        <span className="text-xs text-white/70">Use saved {brand === "paypal" ? "wallet" : "card"}</span>
      </div>
    </button>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  disabled,
}: {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function Footer() {
  return (
    <footer className="mt-10 space-y-6 border-t border-white/10 pt-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="GameVerse" className="h-10 w-10" />
          <span className="text-xl font-semibold">GameVerse</span>
        </div>
        <div className="max-w-xl space-y-2 text-sm text-white/80">
          GameVerse Г?" Where every gamer levels up! From epic AAA adventures to indie gems, grab
          the hottest deals on PC, Xbox, PlayStation & Nintendo. Play more, pay less. dYZr
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm">
          <div className="space-y-2">
            <p className="text-base font-semibold text-white">My Account</p>
            <a href="/user/login" className="block text-white/80">
              My Account
            </a>
            <a href="/user/orders" className="block text-white/80">
              My Orders
            </a>
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-white">Support</p>
            <a href="/terms" className="block text-white/80">
              Terms and conditions
            </a>
            <a href="/privacy" className="block text-white/80">
              Privacy and cookie policy
            </a>
            <a href="/refunds" className="block text-white/80">
              Refund policy
            </a>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <p className="text-sm text-white/70">Copyright GameVerse.com 2025, all rights reserved</p>
        <div className="flex items-center gap-3">
          {socials.map((icon) => (
            <img key={icon} src={icon} alt="social" className="h-8 w-8" loading="lazy" />
          ))}
        </div>
      </div>
    </footer>
  );
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function luhnCheck(value: string) {
  const num = digitsOnly(value);
  if (num.length < 12) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = num.length - 1; i >= 0; i -= 1) {
    let digit = Number(num[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isValidExpiry(value: string) {
  const match = value.trim().match(/^(\d{2})\/?(\d{2})$/);
  if (!match) return false;
  const [_, mm, yy] = match;
  const month = Number(mm);
  const year = Number(`20${yy}`);
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const exp = new Date(year, month, 0);
  return exp >= new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}
