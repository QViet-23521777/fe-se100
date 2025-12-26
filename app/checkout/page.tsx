"use client";

import { TopBar } from "@/components/TopBar";
import { useStore } from "@/app/context/StoreContext";
import { useRouter } from "next/navigation";

type PaymentMethod = "visa" | "mastercard" | "paypal" | "payoneer";

type CardInfo = {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
};

const initialCard: CardInfo = {
  holder: "",
  number: "",
  expiry: "",
  cvv: "",
};

const savedVisa = "•••• •••• •••• 1234";

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
  const { cart, subtotalCents, clearCart } = useStore();
  const subtotal = subtotalCents / 100;
  const canConfirm = cart.length > 0;

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <h1 className="text-4xl font-bold">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.75fr]">
          <div className="space-y-6">
            <PaymentSection />
            <SavedPayment />
            <Gallery />
          </div>

          <OrderSummary
            subtotal={subtotal}
            canConfirm={canConfirm}
            onConfirm={() => {
              clearCart();
              router.push("/");
            }}
          />
        </div>

        <Footer />
      </div>
    </div>
  );
}

function PaymentSection() {
  return (
    <div className="space-y-6 rounded-[20px] bg-gradient-to-b from-white/10 to-black/15 p-6 backdrop-blur">
      <h2 className="text-2xl font-semibold">Payment Method</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PaymentCard brand="visa" active />
        <PaymentCard brand="mastercard" />
        <PaymentCard brand="paypal" />
        <PaymentCard brand="payoneer" />
      </div>

      <div className="space-y-4">
        <Input placeholder="Card Holder Name" />
        <Input placeholder="Card Number" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Expiry Date" />
          <Input placeholder="CVV" />
        </div>
      </div>
    </div>
  );
}

function SavedPayment() {
  return (
    <div className="space-y-4 rounded-[20px] bg-gradient-to-b from-white/10 to-black/15 p-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/20" />
        <p className="text-lg font-semibold">or</p>
        <div className="flex-1 h-px bg-white/20" />
      </div>
      <p className="text-xl font-semibold">Pay with saved method</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <SavedCard brand="visa" number={savedVisa} />
        <SavedCard brand="paypal" number="Paypal" />
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <div className="space-y-3 rounded-[20px] bg-transparent">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
          ▶
        </div>
        <span className="text-sm text-white/80">Trailer & Screenshots</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1a55] text-white">
          ‹
        </button>
        {gallery.map((src) => (
          <img
            key={src}
            src={src}
            alt="shot"
            className="h-24 w-28 rounded-lg object-cover opacity-80 hover:opacity-100 transition"
            loading="lazy"
          />
        ))}
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1a55] text-white">
          ›
        </button>
      </div>
    </div>
  );
}

function OrderSummary({
  subtotal,
  canConfirm,
  onConfirm,
}: {
  subtotal: number;
  canConfirm: boolean;
  onConfirm: () => void;
}) {
  return (
    <aside className="space-y-4 rounded-[18px] bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl">
      <h2 className="text-2xl font-semibold">Order Summary</h2>
      <SummaryRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
      <SummaryRow label="Discount" value="$00.00" />
      <div className="h-px w-full bg-white/20" />
      <div className="flex items-center justify-between text-xl font-semibold">
        <span>Total</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm}
        className={`w-full rounded-[12px] bg-[#1b1a55] px-4 py-3 text-center text-sm font-semibold ${
          canConfirm ? "" : "opacity-50 cursor-not-allowed"
        }`}
      >
        Confirm Payment
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

function PaymentCard({ brand, active }: { brand: PaymentMethod; active?: boolean }) {
  const logos: Record<PaymentMethod, string> = {
    visa: "/assets/0330a8b8c36763d74b8be98cbac253ef243e8163.png",
    mastercard: "/assets/0edf57aebdd94b78202290f6dcae0459bfe5b4b4.png",
    paypal: "/assets/49b272b182ca363870ee17abeb3516cd9b20eb52.png",
    payoneer: "/assets/5abc0e55a1382777afdb381f51650108b607c589.png",
  };
  return (
    <div
      className={`flex h-20 items-center justify-center rounded-[12px] bg-white ${
        active ? "" : "opacity-50"
      }`}
    >
      <img src={logos[brand]} alt={brand} className="h-8 object-contain" />
    </div>
  );
}

function SavedCard({ brand, number }: { brand: PaymentMethod | "paypal"; number: string }) {
  const label = brand === "paypal" ? "Paypal" : number;
  const logo =
    brand === "paypal"
      ? "/assets/49b272b182ca363870ee17abeb3516cd9b20eb52.png"
      : "/assets/0330a8b8c36763d74b8be98cbac253ef243e8163.png";
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-20 items-center justify-center rounded-[10px] bg-white">
        <img src={logo} alt={brand} className="h-7 object-contain" />
      </div>
      <p className="text-sm text-white">{label}</p>
    </div>
  );
}

function Input({ placeholder }: { placeholder: string }) {
  return (
    <input
      placeholder={placeholder}
      className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
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
        <div className="space-y-2 max-w-xl text-sm text-white/80">
          GameVerse — Where every gamer levels up! From epic AAA adventures to
          indie gems, grab the hottest deals on PC, Xbox, PlayStation &
          Nintendo. Play more, pay less. 🎮
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
  );
}
