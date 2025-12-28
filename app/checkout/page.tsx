"use client";

import { useState } from "react";
import Link from "next/link";

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

const API_BASE = "https://your-api-domain.com"; // Replace with your API

export default function CheckoutPage() {
  const [cart, setCart] = useState([
    { id: 1, name: "Cyberpunk 2077", price: 29.99 },
    { id: 2, name: "The Witcher 3", price: 39.99 },
  ]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const canConfirm = cart.length > 0 && email && password;

  const handleConfirmPayment = async () => {
    if (!canConfirm) return;

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Step 1: Login
      const loginRes = await fetch(`${API_BASE}/auth/customer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!loginRes.ok) {
        const data = await loginRes.json().catch(() => null);
        throw new Error(data?.message || "Email hoặc mật khẩu không đúng");
      }

      const loginData = await loginRes.json();

      if (!loginData?.token || !loginData?.user) {
        throw new Error("Invalid response from server");
      }

      let balance = loginData.user.accountBalance;

      // ✅ Step 2: If accountBalance is missing, fetch from /customers/me
      if (balance === undefined || balance === null) {
        console.log(
          "⚠️ accountBalance not in login response, fetching from /customers/me"
        );

        const profileRes = await fetch(`${API_BASE}/customers/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${loginData.token}`,
            "Content-Type": "application/json",
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          balance = profileData.accountBalance ?? 0;
        } else {
          throw new Error("Could not fetch account balance");
        }
      }

      setAccountBalance(balance);

      console.log("✅ Login successful:", {
        email: loginData.user.email,
        balance: balance,
        subtotal: subtotal,
      });

      // Step 3: Check balance
      if (balance < subtotal) {
        setError(
          `Số dư không đủ! Bạn có $${balance.toFixed(
            2
          )}, cần $${subtotal.toFixed(2)}`
        );
        return;
      }

      // Step 4: Process payment
      setSuccess(true);
      setCart([]);

      setTimeout(() => {
        alert(
          `✅ Thanh toán thành công!\n` +
            `Số tiền: $${subtotal.toFixed(2)}\n` +
            `Số dư ban đầu: $${balance.toFixed(2)}\n` +
            `Số dư còn lại: $${(balance - subtotal).toFixed(2)}`
        );
      }, 500);
    } catch (err) {
      console.error("Payment error:", err);
      setError(
        err instanceof Error ? err.message : "Không thể kết nối đến server"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white p-6">
      <div className="flex w-full flex-col gap-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <img src={logo} alt="GameVerse" className="h-10 w-10" />
            <span className="text-xl font-semibold">GameVerse</span>
          </a>
        </div>

        <h1 className="text-4xl font-bold">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.75fr]">
          <div className="space-y-6">
            <div className="space-y-6 rounded-[20px] bg-gradient-to-b from-white/10 to-black/15 p-6 backdrop-blur">
              <h2 className="text-2xl font-semibold">Xác thực tài khoản</h2>
              <p className="text-sm text-white/70">
                Vui lòng đăng nhập để hoàn tất thanh toán
              </p>

              <div className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path
                          d="M3 3l18 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.88 5.09A10.3 10.3 0 0 1 12 5c6.4 0 10 7 10 7a17.1 17.1 0 0 1-2.64 3.78"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.34 6.34C3.8 8.16 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.2 3.27-.55"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {accountBalance !== null && (
                  <div className="rounded-[10px] border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200">Số dư tài khoản:</span>
                      <span className="text-xl font-semibold text-blue-100">
                        ${accountBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-[10px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-[10px] border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                    ✅ Thanh toán thành công!
                  </div>
                )}
              </div>
            </div>

            <Gallery />
          </div>

          <OrderSummary
            subtotal={subtotal}
            canConfirm={canConfirm}
            isLoading={isLoading}
            onConfirm={handleConfirmPayment}
          />
        </div>

        <Footer />
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
  isLoading,
  onConfirm,
}: {
  subtotal: number;
  canConfirm: boolean;
  isLoading: boolean;
  onConfirm: () => void;
}) {
  return (
    <aside className="space-y-4 rounded-[18px] bg-gradient-to-b from-white/10 to-black/20 p-6 shadow-2xl h-fit">
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
        disabled={!canConfirm || isLoading}
        className={`w-full rounded-[12px] bg-[#1b1a55] px-4 py-3 text-center text-sm font-semibold transition ${
          canConfirm && !isLoading
            ? "hover:bg-[#252471]"
            : "opacity-50 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Đang xử lý..." : "Confirm Payment"}
      </button>
      {!canConfirm && (
        <p className="text-xs text-white/60 text-center">
          Vui lòng nhập email và mật khẩu
        </p>
      )}
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
            <a
              href="/user/login"
              className="block text-white/80 hover:text-white"
            >
              My Account
            </a>
            <a
              href="/user/orders"
              className="block text-white/80 hover:text-white"
            >
              My Orders
            </a>
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-white">Support</p>
            <a href="/terms" className="block text-white/80 hover:text-white">
              Terms and conditions
            </a>
            <a href="/privacy" className="block text-white/80 hover:text-white">
              Privacy and cookie policy
            </a>
            <a href="/refunds" className="block text-white/80 hover:text-white">
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
            <img
              key={icon}
              src={icon}
              alt="social"
              className="h-8 w-8"
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </footer>
  );
}
