"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useStore, type StoreItemInput } from "@/app/context/StoreContext";
import { useAuth } from "@/app/context/AuthContext";

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M20.8 4.6c-1.4-1.4-3.6-1.4-5 0L12 8.4 8.2 4.6c-1.4-1.4-3.6-1.4-5 0s-1.4 3.6 0 5l3.8 3.8L12 22l5-8.6 3.8-3.8c1.4-1.4 1.4-3.6 0-5z" />
    </svg>
  );
}

export function WishlistIconButton({
  item,
  className,
}: {
  item: StoreItemInput;
  className?: string;
}) {
  const { token, user } = useAuth();
  const { isWishlisted, toggleWishlist } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const active = isWishlisted(item);
  const loginHref = useMemo(
    () => `/user/login?next=${encodeURIComponent(pathname ?? "/")}`,
    [pathname]
  );

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token || user?.accountType !== "customer") {
          router.push(loginHref);
          return;
        }
        toggleWishlist(item);
      }}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={
        className ??
        `flex h-10 w-10 items-center justify-center rounded-full border ${
          active ? "border-white/30 bg-white/15" : "border-white/10 bg-black/30"
        } text-white/90 backdrop-blur-md transition hover:bg-black/40`
      }
    >
      <HeartIcon className={`h-5 w-5 ${active ? "text-white" : "text-white/80"}`} />
    </button>
  );
}

export function AddToCartPillButton({
  item,
  label,
  className,
}: {
  item: StoreItemInput;
  label: string;
  className?: string;
}) {
  const { token, user } = useAuth();
  const { addToCart } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [flash, setFlash] = useState<"idle" | "added">("idle");
  const loginHref = useMemo(
    () => `/user/login?next=${encodeURIComponent(pathname ?? "/")}`,
    [pathname]
  );

  const text = useMemo(() => {
    if (flash === "added") return "Added";
    return label;
  }, [flash, label]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token || user?.accountType !== "customer") {
          router.push(loginHref);
          return;
        }
        addToCart(item, 1);
        setFlash("added");
        window.setTimeout(() => setFlash("idle"), 900);
      }}
      className={
        className ??
        "rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b1a55] shadow"
      }
    >
      {text}
    </button>
  );
}

export function WishlistTextButton({
  item,
  label = "Add to Wishlist",
  className,
}: {
  item: StoreItemInput;
  label?: string;
  className?: string;
}) {
  const { token, user } = useAuth();
  const { isWishlisted, toggleWishlist } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const active = isWishlisted(item);
  const loginHref = useMemo(
    () => `/user/login?next=${encodeURIComponent(pathname ?? "/")}`,
    [pathname]
  );

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        if (!token || user?.accountType !== "customer") {
          router.push(loginHref);
          return;
        }
        toggleWishlist(item);
      }}
      className={className ?? "rounded-full border border-white/80 px-6 py-3 text-base font-semibold text-white"}
    >
      {active ? "Wishlisted" : label}
    </button>
  );
}

export function ProductActions({
  item,
}: {
  item: StoreItemInput;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user } = useAuth();
  const { addToCart, isWishlisted, toggleWishlist } = useStore();
  const [added, setAdded] = useState(false);
  const wishlisted = isWishlisted(item);
  const loginHref = useMemo(
    () => `/user/login?next=${encodeURIComponent(pathname ?? "/")}`,
    [pathname]
  );

  return (
    <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            if (!token || user?.accountType !== "customer") {
              router.push(loginHref);
              return;
            }
            addToCart(item, 1);
            router.push("/checkout");
          }}
          className="rounded-full bg-white px-4 py-2 text-[#1b1a55] font-semibold"
        >
        Buy Now
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            if (!token || user?.accountType !== "customer") {
              router.push(loginHref);
              return;
            }
            addToCart(item, 1);
            setAdded(true);
            window.setTimeout(() => setAdded(false), 900);
          }}
          className="rounded-full bg-[#1b1a55] px-4 py-2 font-semibold"
        >
          {added ? "Added" : "Add to Cart"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!token || user?.accountType !== "customer") {
              router.push(loginHref);
              return;
            }
            toggleWishlist(item);
          }}
          className="rounded-full border border-white/30 px-4 py-2 font-semibold text-white"
        >
          {wishlisted ? "Wishlisted" : "Add to Wishlist"}
        </button>
      </div>
    </div>
  );
}
