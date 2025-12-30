"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useStore } from "@/app/context/StoreContext";
import { useAuth } from "@/app/context/AuthContext";

export type HeroSlide = {
  id: string;
  title: string;
  description: string;
  price: number;
  imageSrc: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
};

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { addToCart, isWishlisted, toggleWishlist } = useStore();
  const { token, user } = useAuth();
  const safeSlides = useMemo(
    () => (slides.length > 0 ? slides : []),
    [slides]
  );
  const [active, setActive] = useState(0);

  const current = safeSlides[active];
  const storeItem = useMemo(() => {
    if (!current) return null;
    const asNumber = Number(current.id);
    const steamAppId =
      Number.isFinite(asNumber) && Number.isInteger(asNumber) ? asNumber : undefined;
    return {
      steamAppId,
      slug: steamAppId ? undefined : current.id,
      name: current.title,
      image: current.imageSrc,
      priceLabel: `$${current.price.toFixed(2)}`,
      originalPriceLabel: null,
    };
  }, [current]);

  const goPrev = () => {
    setActive((prev) =>
      safeSlides.length === 0 ? 0 : (prev - 1 + safeSlides.length) % safeSlides.length
    );
  };

  const goNext = () => {
    setActive((prev) =>
      safeSlides.length === 0 ? 0 : (prev + 1) % safeSlides.length
    );
  };

  if (!current || !storeItem) return null;

  const wishlisted = isWishlisted(storeItem);
  const loginHref = useMemo(
    () => `/user/login?next=${encodeURIComponent(pathname ?? "/")}`,
    [pathname]
  );

  return (
    <section
      aria-label="Featured"
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl"
    >
      <div className="absolute inset-0">
        <img
          key={current.id}
          src={current.imageSrc}
          alt=""
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050b2a]/95 via-[#050b2a]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b2a]/70 via-transparent to-transparent" />
      </div>

      <div className="relative grid grid-cols-1 gap-10 p-7 sm:p-10 lg:grid-cols-12 lg:gap-6 lg:p-12">
        <div className="lg:col-span-7">
          <p className="text-sm font-medium tracking-wide text-white/70">
            Featured Game
          </p>
          <h1 className="mt-4 text-balance text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            {current.title}
          </h1>
          <p className="mt-5 max-w-prose text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
            {current.description}
          </p>
        </div>

        <div className="flex flex-col justify-end gap-3 lg:col-span-5 lg:items-end">
          <p className="font-martian-mono text-sm text-white/80 lg:text-right">
            ${current.price.toFixed(2)}
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!token || user?.accountType !== "customer") {
                  router.push(loginHref);
                  return;
                }
                addToCart(storeItem, 1);
                router.push("/checkout");
              }}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#050b2a] transition hover:bg-white/90"
            >
              {current.ctaPrimary ?? "Buy Now"}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(storeItem)}
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/90 backdrop-blur-md transition hover:bg-white/10"
            >
              {wishlisted ? "Wishlisted" : current.ctaSecondary ?? "Add to Wishlist"}
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous featured game"
        className="absolute left-4 top-1/2 hidden h-24 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-xl transition hover:bg-white/10 md:flex"
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={goNext}
        aria-label="Next featured game"
        className="absolute right-4 top-1/2 hidden h-24 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-xl transition hover:bg-white/10 md:flex"
      >
        <ChevronRightIcon className="h-6 w-6" />
      </button>

      <div className="relative flex items-center justify-center gap-2 pb-5">
        {safeSlides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => setActive(idx)}
            className={`h-2.5 rounded-full transition ${
              idx === active
                ? "w-8 bg-white/80"
                : "w-2.5 bg-white/20 hover:bg-white/35"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
