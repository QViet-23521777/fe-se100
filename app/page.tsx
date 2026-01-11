import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import {
  AddToCartPillButton,
  WishlistIconButton,
  WishlistTextButton,
} from "@/components/StoreActions";
import CarouselRow, { type CarouselItem } from "@/components/landing/CarouselRow";
import { fetchRandomSteamApps, type SteamApp } from "@/lib/steam-apps";
import {
  centsToUsd,
  fetchSteamAppDetailsBatch,
  type SteamAppStoreDetails,
} from "@/lib/steam-store";
import { applyStorePromotionsToUsd, fetchActiveStorePromotions, type StorePromotion } from "@/lib/store-promotions";

export const revalidate = 300;

type GameItem = {
  steamAppId?: number;
  title: string;
  price: string;
  originalPrice?: string;
  cta?: string;
  image: string;
  tag?: string;
};

type Promo = {
  title: string;
  copy: string;
  action: string;
  image: string;
  background: string;
};

type CategoryItem = {
  title: string;
  image: string;
  overlay?: string;
};

const assets = {
  hero: "/assets/figma-hero-group.jpg",
  logo: "/assets/figma-logo.svg",
  brandMark: "/assets/figma-logo.svg",
  search: "/assets/figma-topbar.png",
  arrowThin: "/assets/figma-social-28-2108.svg",
  arrowLeft: "/assets/figma-social-28-2110.svg",
  arrowRight: "/assets/figma-social-28-2111.svg",
  heartOutline: "/assets/figma-social-28-2109.svg",
  heartBg: "/assets/figma-social-28-2108.svg",
  promoGift: "/assets/figma-28-2007.png",
  promoCoupon: "/assets/figma-28-2014.png",
  socials: [
    "/assets/figma-social-28-2108.svg",
    "/assets/figma-social-28-2109.svg",
    "/assets/figma-social-28-2110.svg",
    "/assets/figma-social-28-2111.svg",
  ],
};

const PRICE_POINTS = [
  9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 69.99,
];
const DISCOUNT_POINTS = [10, 15, 20, 25, 30, 40, 50, 60];

function formatUsd(price: number) {
  return `$${price.toFixed(2)}`;
}

function parseUsdLabel(label: string | undefined) {
  if (!label) return 0;
  const match = label.match(/(\d+[.,]?\d{0,2})/);
  if (!match) return 0;
  const normalized = match[1].replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return 0;
  return value;
}

function steamHeaderUrl(app: SteamApp) {
  return (
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${app.steamAppId}/header.jpg`
  );
}

function shuffle<T>(input: T[]) {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pseudoOriginalPrice(steamAppId: number) {
  const idx = Math.abs(steamAppId) % PRICE_POINTS.length;
  return PRICE_POINTS[idx];
}

function pseudoDiscountPercent(steamAppId: number) {
  const idx = Math.abs(steamAppId) % DISCOUNT_POINTS.length;
  return DISCOUNT_POINTS[idx];
}

function applyStorePromoToUsd(priceUsd: number, promos: StorePromotion[]) {
  if (!Array.isArray(promos) || promos.length === 0) return null;
  const applied = applyStorePromotionsToUsd(priceUsd, promos);
  if (!applied.discountLabel) return null;
  if (!Number.isFinite(applied.priceUsd) || applied.priceUsd >= priceUsd) return null;
  return applied;
}

type ScoredSteamApp = {
  app: SteamApp;
  details: SteamAppStoreDetails | null;
  comingSoon: boolean;
  discountPercent: number;
  recommendations: number;
  price: number;
  originalPrice?: number;
  imageSrc: string;
};

function priceFromSteam(details: SteamAppStoreDetails | null, steamAppId: number) {
  if (details?.is_free) return { price: 0 as number, originalPrice: undefined, discount: 0 };
  const discount = details?.price_overview?.discount_percent ?? 0;
  const finalUsd = centsToUsd(details?.price_overview?.final);
  const initialUsd = centsToUsd(details?.price_overview?.initial);

  const fallback = pseudoOriginalPrice(steamAppId);
  const price = typeof finalUsd === "number" ? finalUsd : fallback;
  const originalPrice =
    discount > 0 && typeof initialUsd === "number" ? initialUsd : undefined;

  return { price, originalPrice, discount };
}

function scoreSteamApp(app: SteamApp, details: SteamAppStoreDetails | null): ScoredSteamApp {
  const comingSoon = Boolean(details?.release_date?.coming_soon);
  const recommendations = details?.recommendations?.total ?? 0;
  const { price, originalPrice, discount } = priceFromSteam(details, app.steamAppId);
  const imageSrc = details?.header_image ?? steamHeaderUrl(app);

  return {
    app,
    details,
    comingSoon,
    discountPercent: discount ?? 0,
    recommendations: Number.isFinite(recommendations) ? recommendations : 0,
    price,
    originalPrice,
    imageSrc,
  };
}

function toCarouselItemFromScore(
  scored: ScoredSteamApp,
  kind: "default" | "deal" = "default",
  storePromos: StorePromotion[] = []
): CarouselItem {
  const title = scored.details?.name?.trim() || scored.app.name;
  const storeApplied = applyStorePromoToUsd(scored.price, storePromos);
  const effectivePrice = storeApplied ? storeApplied.priceUsd : scored.price;
  if (kind === "deal") {
    const original =
      typeof scored.originalPrice === "number"
        ? scored.originalPrice
        : pseudoOriginalPrice(scored.app.steamAppId);
    const price =
      typeof effectivePrice === "number"
        ? effectivePrice
        : Math.max(0, Math.round(original * (100 - scored.discountPercent)) / 100);

    const discountPercent =
      original > 0 ? Math.round(((original - price) / original) * 100) : scored.discountPercent;

    return {
      id: String(scored.app.steamAppId),
      title,
      price,
      originalPrice: original,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      imageSrc: scored.imageSrc,
    };
  }

  return {
    id: String(scored.app.steamAppId),
    title,
    price: Number.isFinite(effectivePrice) ? effectivePrice : pseudoOriginalPrice(scored.app.steamAppId),
    imageSrc: scored.imageSrc,
  };
}

function toGameItemFromScore(
  scored: ScoredSteamApp,
  options: { cta: string; kind?: "default" | "deal" },
  storePromos: StorePromotion[] = []
): GameItem {
  const safePrice = Number.isFinite(scored.price) ? scored.price : pseudoOriginalPrice(scored.app.steamAppId);
  const storeApplied = applyStorePromoToUsd(safePrice, storePromos);
  const effectivePrice = storeApplied ? storeApplied.priceUsd : safePrice;
  const priceLabel = scored.details?.is_free ? "Free" : formatUsd(effectivePrice);
  const title = scored.details?.name?.trim() || scored.app.name;

  if (options.kind === "deal") {
    const originalPrice =
      typeof scored.originalPrice === "number"
        ? scored.originalPrice
        : pseudoOriginalPrice(scored.app.steamAppId);
    const discountPercent =
      originalPrice > 0 ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : scored.discountPercent;
    return {
      steamAppId: scored.app.steamAppId,
      title,
      price: scored.details?.is_free ? "Free" : formatUsd(effectivePrice),
      originalPrice: formatUsd(originalPrice),
      image: scored.imageSrc,
      tag:
        scored.details?.is_free
          ? undefined
          : storeApplied?.discountLabel?.startsWith("-$")
            ? storeApplied.discountLabel
            : discountPercent > 0
              ? `-${discountPercent}%`
              : undefined,
      cta: options.cta,
    };
  }

  return {
    steamAppId: scored.app.steamAppId,
    title,
    price: priceLabel,
    image: scored.imageSrc,
    cta: options.cta,
  };
}

function toCarouselItem(app: SteamApp, kind: "default" | "deal" = "default"): CarouselItem {
  const original = pseudoOriginalPrice(app.steamAppId);
  const imageSrc = steamHeaderUrl(app);

  if (kind === "deal") {
    const discountPercent = pseudoDiscountPercent(app.steamAppId);
    const price = Math.max(0, Math.round(original * (100 - discountPercent)) / 100);
    return {
      id: String(app.steamAppId),
      title: app.name,
      price,
      originalPrice: original,
      discountPercent,
      imageSrc,
    };
  }

  return {
    id: String(app.steamAppId),
    title: app.name,
    price: original,
    imageSrc,
  };
}

function toSteamGameItem(
  app: SteamApp,
  options: { cta: string; kind?: "default" | "deal" }
): GameItem {
  const original = pseudoOriginalPrice(app.steamAppId);
  const image = steamHeaderUrl(app);

  if (options.kind === "deal") {
    const discount = pseudoDiscountPercent(app.steamAppId);
    const discounted = Math.max(
      0,
      Math.round(original * (100 - discount)) / 100
    );
    return {
      steamAppId: app.steamAppId,
      title: app.name,
      price: formatUsd(discounted),
      originalPrice: formatUsd(original),
      image,
      tag: `-${discount}%`,
      cta: options.cta,
    };
  }

  return {
    steamAppId: app.steamAppId,
    title: app.name,
    price: formatUsd(original),
    image,
    cta: options.cta,
  };
}

const upcomingGames: GameItem[] = [
  {
    steamAppId: 1941540,
    title: "Mafia: The Old Country",
    price: "$49.99",
    cta: "Pre-Order",
    image:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1941540/d06980bb8f41737ca68da8eed40079347db09c84/header.jpg?t=1764177372",
  },
  {
    steamAppId: 3405690,
    title: "EA SPORTS FC 26",
    price: "$69.99",
    cta: "Pre-Order",
    image:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3405690/2d96aa1b06e453cd62dae9029d412f19e61932c3/header.jpg?t=1765797265",
  },
  {
    steamAppId: 1620730,
    title: "Hell is Us",
    price: "$29.99",
    cta: "Pre-Order",
    image:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1620730/7d40fd2849a6b259ee4de2b77dd643e9306104aa/header.jpg?t=1760603460",
  },
  {
    title: "Starfall Odyssey",
    price: "$59.99",
    cta: "Pre-Order",
    image: "/assets/1d6d5ae07fe3da8267a6f757f03f02f18eff9f08.png",
  },
  {
    title: "Neon Noir",
    price: "$39.99",
    cta: "Pre-Order",
    image: "/assets/29b13c258d993ae606182d40bff29a511967883f.png",
  },
  {
    title: "Chrono Drift",
    price: "$44.99",
    cta: "Pre-Order",
    image: "/assets/05d783cce6ca28a9bb202198b4b629201043fd0e.png",
  },
  {
    title: "Eclipse Protocol",
    price: "$69.99",
    cta: "Pre-Order",
    image: "/assets/35b7aefe0e6e92e5046081670ba380dbb7245523.png",
  },
  {
    title: "Skyforge Legends",
    price: "$54.99",
    cta: "Pre-Order",
    image: "/assets/d7d9eaf2c6b2facbb5fe1540f90aba3c88e999f1.png",
  },
  {
    title: "Aurora Nexus",
    price: "$64.99",
    cta: "Pre-Order",
    image: "/assets/ade3f8374a32d9c832eed8e7c34accadfdc86d87.png",
  },
  {
    title: "Frostbound",
    price: "$59.99",
    cta: "Pre-Order",
    image: "/assets/148312359c41c9460a4ef41fa8a0975521da92d6.png",
  },
];

const trendingGames: GameItem[] = [
  {
    title: "Ikari Warriors 4",
    price: "$69.99",
    cta: "Pre-Order",
    image: "/assets/card-33-393.jpg",
  },
  {
    title: "Peter Moore",
    price: "$49.99",
    cta: "Buy Now",
    image: "/assets/card-33-394.jpg",
  },
  {
    title: "R.P.D Remake",
    price: "$59.99",
    cta: "Buy Now",
    image: "/assets/card-33-395.jpg",
  },
  {
    title: "Cyber Rally",
    price: "$39.99",
    cta: "Buy Now",
    image: "/assets/0b3cd3253b9830d749ccd0e52ee184758293bf9e.png",
  },
  {
    title: "Shadow Circuit",
    price: "$34.99",
    cta: "Buy Now",
    image: "/assets/82dbcac61b11c77ced4b7b8e01436a85748c7432.png",
  },
  {
    title: "Ion Runner",
    price: "$29.99",
    cta: "Buy Now",
    image: "/assets/690ad191d6f4c314ae31ce32eb8020e35e625bf9.png",
  },
  {
    title: "Deep Blue",
    price: "$27.99",
    cta: "Buy Now",
    image: "/assets/89f0123396619d52c0a3ac71a6a615bdf29a3566.png",
  },
  {
    title: "Arcstorm",
    price: "$44.99",
    cta: "Buy Now",
    image: "/assets/0b3cd3253b9830d749ccd0e52ee184758293bf9e.png",
  },
  {
    title: "Quantum Rush",
    price: "$49.99",
    cta: "Buy Now",
    image: "/assets/80065c60e22be67fb21c2eebde9f5cc25af94d35.png",
  },
  {
    title: "Midnight Drift",
    price: "$32.99",
    cta: "Buy Now",
    image: "/assets/e4a67992efe823b6dab661c4eb0ca346aaf63b8c.png",
  },
];

const bestsellers: GameItem[] = [
  {
    title: "Red Dead Redemption 2",
    price: "$24.99",
    image: "/assets/card-35-512.jpg",
    cta: "Buy Now",
  },
  {
    title: "It Takes Two",
    price: "$19.99",
    image: "/assets/card-31-341.jpg",
    cta: "Buy Now",
  },
  {
    title: "Ori and the Will of the Wisps",
    price: "$14.99",
    image: "/assets/card-31-342.jpg",
    cta: "Buy Now",
  },
  {
    title: "Sea of Thieves",
    price: "$29.99",
    image: "/assets/card-35-513.jpg",
    cta: "Buy Now",
  },
  {
    title: "Need for Speed",
    price: "$17.99",
    image: "/assets/card-31-343.jpg",
    cta: "Buy Now",
  },
  {
    title: "WRC Rally",
    price: "$19.99",
    image: "/assets/card-35-514.jpg",
    cta: "Buy Now",
  },
  {
    title: "Skylines Reborn",
    price: "$24.99",
    image: "/assets/ab5db46fa48ae418fb1e714c94f7d5a69398dd91.png",
    cta: "Buy Now",
  },
  {
    title: "Galactic Frontiers",
    price: "$34.99",
    image: "/assets/41257b534936f9a3c9376f415acb8f44d64be4bd.png",
    cta: "Buy Now",
  },
  {
    title: "Forgotten Sands",
    price: "$21.99",
    image: "/assets/062524061a9c69da33a8e8844b2cde4436dfd21d.png",
    cta: "Buy Now",
  },
  {
    title: "Vortex Siege",
    price: "$27.99",
    image: "/assets/49b272b182ca363870ee17abeb3516cd9b20eb52.png",
    cta: "Buy Now",
  },
];

const bestDeals: GameItem[] = [
  {
    title: "It Takes Two",
    price: "$19.99",
    cta: "Buy Now",
    image: "/assets/card-33-396.jpg",
  },
  {
    title: "Need for Speed Turbo",
    price: "$14.99",
    cta: "Buy Now",
    image: "/assets/card-31-343.jpg",
  },
  {
    title: "WRC 10 FIA",
    price: "$17.99",
    cta: "Buy Now",
    image: "/assets/card-35-514.jpg",
  },
  {
    title: "Project Velocity",
    price: "$12.99",
    originalPrice: "$29.99",
    cta: "Buy Now",
    image: "/assets/29b13c258d993ae606182d40bff29a511967883f.png",
  },
  {
    title: "Echoes of Ruin",
    price: "$14.99",
    originalPrice: "$39.99",
    cta: "Buy Now",
    image: "/assets/34482bc3b3126f3d89642bb412ebf3523dc1d818.png",
  },
  {
    title: "Drift Horizon",
    price: "$11.99",
    originalPrice: "$24.99",
    cta: "Buy Now",
    image: "/assets/0b3cd3253b9830d749ccd0e52ee184758293bf9e.png",
  },
  {
    title: "Neptune Rising",
    price: "$16.99",
    originalPrice: "$32.99",
    cta: "Buy Now",
    image: "/assets/5dd5e36eb794e5678d435be8ccc66f4671f33013.png",
  },
  {
    title: "Shadow Bazaar",
    price: "$9.99",
    originalPrice: "$24.99",
    cta: "Buy Now",
    image: "/assets/5f23030da66ae6c0112350ce2246875ea4cf2bdc.png",
  },
  {
    title: "Crimson Dunes",
    price: "$13.99",
    originalPrice: "$29.99",
    cta: "Buy Now",
    image: "/assets/5abc0e55a1382777afdb381f51650108b607c589.png",
  },
  {
    title: "Solaris Drift",
    price: "$15.99",
    originalPrice: "$34.99",
    cta: "Buy Now",
    image: "/assets/16564898fd2e0eb4ee58041d24799f097ca09444.png",
  },
];

const promos: Promo[] = [
  {
    title: "Sales & Specials",
    copy: "Score stackable rewards and limited-time discounts across top games.",
    action: "Browse",
    image: assets.promoCoupon,
    background: "from-[#fcd9e6] to-[#f5a8d1]",
  },
  {
    title: "Free Games",
    copy: "Unlock weekly free drops—keep forever, expand your library effortlessly.",
    action: "Claim",
    image: assets.promoGift,
    background: "from-[#cbe7ff] to-[#9ac5ff]",
  },
];

const categories: CategoryItem[] = [
  {
    title: "Action",
    image: "/assets/4346359b5a5ce35d39e5bcd274f1c76bf5f079c7.png",
    overlay: "/assets/6f8a911f3914164ed251382406d463428f9e25e4.png",
  },
  {
    title: "Adventure",
    image: "/assets/cefb44548aa4f68b25dc98767dccb5e192b031d9.png",
    overlay: "/assets/fa10b6d8a4d86047ac12ba982cdc9da2496f6a5c.png",
  },
  {
    title: "Arcade",
    image: "/assets/c66f6fc7f705c6ba7870d5e388be3974f95ac399.png",
    overlay: "/assets/daa2fdc1de3de47d995cf12d9162d68891db1ce0.png",
  },
  {
    title: "FPS",
    image: "/assets/7dc5981fd10c576cb2a000f443519931b31af2f5.png",
    overlay: "/assets/9008d51698b8987a24e2c0aeb4012639a52d0c65.png",
  },
  {
    title: "Fighting",
    image: "/assets/20759c2ad2fd854ef00950fe8dcf188be23fddf0.png",
    overlay: "/assets/797f41de4d2be9a8f082a87d915bb3016b3c900b.png",
  },
  {
    title: "Single-Player",
    image: "/assets/ca68f4d857a17247bb31d71a1d4bc75128b04f2b.png",
    overlay: "/assets/1a4aaed1874a64fe7f3425412441723490160566.png",
  },
  {
    title: "VR",
    image: "/assets/370ba80f98a31fa3766a7c51898713ecd67e58c4.png",
    overlay: "/assets/2d6340d34943042ad974542ba5d86cd5d8864c0c.png",
  },
  {
    title: "RPG",
    image: "/assets/f848b27f9f0be7a5b3684332f590a68c3bd9754c.png",
    overlay: "/assets/d711c5060c2e323ee3df8186b2361f158e9f68f5.png",
  },
];

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-3xl font-semibold text-white">{title}</h2>
      <img src={assets.arrowThin} alt="" className="h-4 w-4" loading="lazy" />
    </div>
  );
}

function GameCard({
  item,
  compact = false,
}: {
  item: GameItem;
  compact?: boolean;
}) {
  const href = item.steamAppId ? `/product/${item.steamAppId}` : "/browse";
  const height = compact ? "h-[180px]" : "h-[220px]";
  const imageSizes = compact
    ? "(min-width: 1024px) 260px, (min-width: 640px) 45vw, 100vw"
    : "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw";
  const storeItem = {
    steamAppId: item.steamAppId,
    name: item.title,
    image: item.image,
    priceLabel: item.price,
    originalPriceLabel: item.originalPrice,
  };

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c1430] shadow-lg ${height}`}
    >
      <Image
        src={item.image}
        alt={item.title}
        fill
        sizes={imageSizes}
        className="object-cover opacity-90 transition duration-300 group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070f2b] via-[#070f2b]/35 to-transparent" />
      <div className="relative flex h-full flex-col justify-end gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <WishlistIconButton
              item={storeItem}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/90 backdrop-blur-md transition hover:bg-black/40"
            />
            <p className="text-lg font-semibold leading-tight">{item.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.tag ? (
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1b1a55]">
                {item.tag}
              </span>
            ) : null}
            {item.cta ? (
              <AddToCartPillButton item={storeItem} label={item.cta} />
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-white/80">
            {item.originalPrice ? (
              <span className="text-white/50 line-through">
                {item.originalPrice}
              </span>
            ) : null}
            <span className="font-semibold text-white/90">{item.price}</span>
          </div>
          {!compact ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70">
              ♡
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function PromoCard({ promo }: { promo: Promo }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${promo.background} p-6 text-[#1b1a55] shadow-xl`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70">
          <img src={promo.image} alt="" className="h-12 w-12" loading="lazy" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-semibold text-[#0f0e2c]">{promo.title}</p>
          <p className="text-sm text-[#1f2b4d]">{promo.copy}</p>
          <button className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#1b1a55] px-4 py-2 text-sm font-semibold text-white">
            {promo.action}
          </button>
        </div>
      </div>
    </div>
  );
}

function categoryBrowseHref(title: string) {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return "/browse";
  if (normalized === "single-player" || normalized === "single player") {
    return "/browse?category=single-player";
  }
  if (normalized === "vr") {
    return "/browse?category=vr";
  }
  if (normalized === "fps") {
    return "/browse?category=fps";
  }
  return `/browse?genre=${encodeURIComponent(title)}`;
}

function CategoryCard({ item }: { item: CategoryItem }) {
  const href = categoryBrowseHref(item.title);
  return (
    <Link
      href={href}
      className="group relative block h-[200px] overflow-hidden rounded-[18px] bg-[#0c1430] shadow-lg"
      aria-label={`Browse ${item.title}`}
    >
      <img
        src={item.image}
        alt={item.title}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070f2b]/80 via-[#070f2b]/40 to-transparent" />
      {item.overlay ? (
        <img
          src={item.overlay}
          alt=""
          className="pointer-events-none absolute inset-x-3 bottom-0 top-auto h-[160px] w-auto object-contain"
          loading="lazy"
        />
      ) : null}
      <p className="absolute left-4 bottom-4 text-lg font-semibold text-white drop-shadow">
        {item.title}
      </p>
      <span className="absolute inset-0 rounded-[18px] ring-1 ring-white/0 transition group-hover:ring-white/15" />
    </Link>
  );
}

function heroTitleLines(title: string) {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (!cleaned) return ["Featured", "Game"];

  const words = cleaned.split(" ").slice(0, 8);
  if (words.length <= 4) return words.map((w) => w.toUpperCase());

  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")].map((line) =>
    line.toUpperCase()
  );
}

function Hero({ featured }: { featured: GameItem }) {
  const titleLines = heroTitleLines(featured.title);
  const storeItem = {
    steamAppId: featured.steamAppId,
    name: featured.title,
    image: featured.image,
    priceLabel: featured.price,
    originalPriceLabel: featured.originalPrice ?? null,
  };
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#0c143d] shadow-2xl">
      <Image
        src={featured.image}
        alt={featured.title}
        fill
        priority
        loading="eager"
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#070f2b]/50 via-[#070f2b]/20 to-[#070f2b]" />
      <div className="relative flex flex-col gap-10 px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.4fr] lg:items-end">
          <div className="space-y-6">
            <div className="space-y-2 text-5xl font-extrabold leading-none sm:text-6xl">
              {titleLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="max-w-2xl text-base text-white/75 sm:text-lg">
              Discover new adventures every day. Explore top titles, snag great
              deals, and build your next wishlist.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={featured.steamAppId ? `/product/${featured.steamAppId}` : "/browse"}
                className="rounded-full bg-white px-6 py-3 text-base font-semibold text-[#1b1a55] shadow"
              >
                Buy Now
              </Link>
              <WishlistTextButton
                item={storeItem}
                label="Add to Wishlist"
                className="rounded-full border border-white/80 px-6 py-3 text-base font-semibold text-white"
              />
              <span className="ml-2 text-2xl font-semibold text-white">{featured.price}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 p-3 backdrop-blur-md">
              <img
                src={assets.arrowLeft}
                alt="Previous"
                className="h-6 w-6"
                loading="lazy"
              />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 p-3 backdrop-blur-md">
              <img
                src={assets.arrowRight}
                alt="Next"
                className="h-6 w-6"
                loading="lazy"
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const maxSkipGuessRaw = Number(
    process.env.STEAM_APPS_MAX_SKIP ??
      process.env.NEXT_PUBLIC_STEAM_APPS_MAX_SKIP ??
      "85000"
  );
  const maxSkipGuess = Number.isFinite(maxSkipGuessRaw) ? maxSkipGuessRaw : 85000;
  const perRow = 10;
  const desiredTotal = 1 + perRow * 4;
  const listRevalidateSeconds = 60 * 5;
  const storePromos = await fetchActiveStorePromotions();

  const apiAppPool: SteamApp[] = [];
  const seenApiIds = new Set<number>();
  const scoredPool: ScoredSteamApp[] = [];

  const maxAttempts = 6;
  const batchSize = 18;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const apps = await fetchRandomSteamApps({
      limit: batchSize,
      maxSkipGuess,
      revalidateSeconds: listRevalidateSeconds,
    });
    const fresh = apps.filter((app) => {
      if (seenApiIds.has(app.steamAppId)) return false;
      seenApiIds.add(app.steamAppId);
      return true;
    });
    apiAppPool.push(...fresh);

    if (fresh.length === 0) continue;

    const detailsMap = await fetchSteamAppDetailsBatch(
      fresh.map((app) => app.steamAppId),
      { revalidateSeconds: 60 * 10, concurrency: 6 }
    );

    for (const app of fresh) {
      scoredPool.push(scoreSteamApp(app, detailsMap.get(app.steamAppId) ?? null));
    }

    const dealsCount = scoredPool.filter(
      (item) => !item.comingSoon && item.discountPercent > 0 && item.originalPrice
    ).length;
    const upcomingCount = scoredPool.filter((item) => item.comingSoon).length;
    const popularCount = scoredPool.filter(
      (item) => !item.comingSoon && item.discountPercent === 0
    ).length;

    if (
      dealsCount >= perRow &&
      (upcomingCount >= Math.min(perRow, 4) || attempt >= 2) &&
      popularCount >= perRow * 2
    ) {
      break;
    }
  }

  const scoredUnique = scoredPool.filter((item, idx, arr) => {
    const firstIdx = arr.findIndex((other) => other.app.steamAppId === item.app.steamAppId);
    return firstIdx === idx;
  });

  const usedIds = new Set<number>();

  const dealsPool = scoredUnique
    .filter((item) => !item.comingSoon && item.discountPercent > 0 && item.originalPrice)
    .sort((a, b) => {
      if (b.discountPercent !== a.discountPercent) return b.discountPercent - a.discountPercent;
      return b.recommendations - a.recommendations;
    });

  // If Steam doesn't return enough discounted titles, fall back to popular items and
  // synthesize a reasonable discount so the row still shows real games instead of
  // static placeholders.
  const dealCandidates = [...dealsPool];
  if (dealCandidates.length < perRow) {
    const filler = scoredUnique
      .filter((item) => !item.comingSoon)
      .sort((a, b) => b.recommendations - a.recommendations)
      .map((item) => {
        const original =
          typeof item.originalPrice === "number"
            ? item.originalPrice
            : pseudoOriginalPrice(item.app.steamAppId);
        const price =
          typeof item.price === "number" && item.price > 0
            ? item.price
            : Math.max(0, Math.round(original * (100 - pseudoDiscountPercent(item.app.steamAppId))) / 100);
        const discount =
          item.discountPercent && item.discountPercent > 0
            ? item.discountPercent
            : Math.max(1, pseudoDiscountPercent(item.app.steamAppId));

        return {
          ...item,
          originalPrice: original,
          price,
          discountPercent: discount,
        };
      });
    dealCandidates.push(...filler);
  }

  const upcomingPool = scoredUnique
    .filter((item) => item.comingSoon)
    .sort((a, b) => b.recommendations - a.recommendations);

  const popularPool = scoredUnique
    .filter((item) => !item.comingSoon && item.discountPercent === 0)
    .sort((a, b) => b.recommendations - a.recommendations);

  function takeUnique(list: ScoredSteamApp[], count: number) {
    const picked: ScoredSteamApp[] = [];
    for (const item of list) {
      if (picked.length >= count) break;
      if (usedIds.has(item.app.steamAppId)) continue;
      usedIds.add(item.app.steamAppId);
      picked.push(item);
    }
    return picked;
  }

  const bestDealPicked = takeUnique(dealCandidates, perRow);
  const bestsellerPicked = takeUnique(popularPool, perRow);
  const trendingPicked = takeUnique(popularPool.slice(perRow), perRow);
  const upcomingBase = takeUnique(upcomingPool, perRow);
  const upcomingPicked =
    upcomingBase.length >= perRow
      ? upcomingBase
      : [...upcomingBase, ...takeUnique(popularPool, perRow - upcomingBase.length)];

  const featuredScored =
    shuffle([...bestsellerPicked, ...trendingPicked, ...bestDealPicked])[0] ??
    shuffle(scoredUnique.filter((item) => !item.comingSoon))[0] ??
    shuffle(scoredUnique)[0] ??
    null;

  const featuredItem = featuredScored
    ? toGameItemFromScore(featuredScored, { cta: "Buy Now" }, storePromos)
    : {
        title: "The Last of Us Part II",
        price: "$49.99",
        image: assets.hero,
        cta: "Buy Now",
      };

  const fallbackUpcoming = upcomingGames.map((game) => ({
    id: game.steamAppId ? String(game.steamAppId) : game.title,
    title: game.title,
    price: parseUsdLabel(game.price),
    imageSrc: game.image,
    href: `/browse?q=${encodeURIComponent(game.title)}`,
  }));
  const fallbackTrending = trendingGames.map((game) => ({
    id: game.steamAppId ? String(game.steamAppId) : game.title,
    title: game.title,
    price: parseUsdLabel(game.price),
    imageSrc: game.image,
    href: `/browse?q=${encodeURIComponent(game.title)}`,
  }));
  const fallbackBestsellers = bestsellers.map((game) => ({
    id: game.steamAppId ? String(game.steamAppId) : game.title,
    title: game.title,
    price: parseUsdLabel(game.price),
    imageSrc: game.image,
    href: `/browse?q=${encodeURIComponent(game.title)}`,
  }));
  const fallbackDeals = bestDeals.map((game) => {
    const discountPercent = game.tag
      ? Number(game.tag.replace(/[^0-9]/g, ""))
      : undefined;

    return {
      id: game.steamAppId ? String(game.steamAppId) : game.title,
      title: game.title,
      price: parseUsdLabel(game.price),
      originalPrice: game.originalPrice ? parseUsdLabel(game.originalPrice) : undefined,
      discountPercent: Number.isFinite(discountPercent) ? discountPercent : undefined,
      imageSrc: game.image,
      href: `/browse?q=${encodeURIComponent(game.title)}`,
    };
  });

  function fillToLength<T extends { id: string }>(primary: T[], fallback: T[], target: number) {
    if (primary.length >= target) return primary.slice(0, target);
    if (primary.length > 0) {
      const needed = target - primary.length;
      const extras = fallback.filter((f) => !primary.some((p) => p.id === f.id)).slice(0, needed);
      return [...primary, ...extras];
    }
    if (fallback.length >= target) return fallback.slice(0, target);
    return fallback.slice();
  }

  const upcomingItems = fillToLength(
    upcomingPicked.map((item) => toCarouselItemFromScore(item, "default", storePromos)),
    fallbackUpcoming,
    perRow
  );
  const trendingItems = fillToLength(
    trendingPicked.map((item) => toCarouselItemFromScore(item, "default", storePromos)),
    fallbackTrending,
    perRow
  );
  const bestsellerItems = fillToLength(
    bestsellerPicked.map((item) => toCarouselItemFromScore(item, "default", storePromos)),
    fallbackBestsellers,
    perRow
  );
  const bestDealItems = fillToLength(
    bestDealPicked.map((item) => toCarouselItemFromScore(item, "deal", storePromos)),
    fallbackDeals,
    perRow
  );

  const showApiHint = apiAppPool.length === 0;
  return (
    <div className="w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-12 px-5 pb-16 pt-4 sm:px-8 lg:px-10">
        <TopBar active="home" />

        <Hero featured={featuredItem} />

        {showApiHint ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c143d]/60 p-5 text-sm text-white/75 shadow-xl">
            Start the `game-store-api` server to load Steam games on the
            homepage.
          </div>
        ) : null}

        <CarouselRow
          id="upcoming"
          title="Upcoming Games"
          items={upcomingItems}
          ctaLabel="Pre-Order"
        />

        <CarouselRow
          id="trending"
          title="Trending"
          items={trendingItems}
          ctaLabel="Add to Cart"
        />

        <CarouselRow
          id="bestsellers"
          title="Bestsellers"
          items={bestsellerItems}
          ctaLabel="Buy Now"
        />

        <CarouselRow
          id="best-deals"
          title="Best Deals"
          items={bestDealItems}
          ctaLabel="Add to Cart"
        />

        <section className="grid gap-6 md:grid-cols-2">
          {promos.map((promo) => (
            <PromoCard key={promo.title} promo={promo} />
          ))}
        </section>

        <section className="space-y-6">
          <SectionTitle title="Categories" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.title} item={cat} />
            ))}
          </div>
        </section>

        <footer className="space-y-6 rounded-3xl border border-white/10 bg-[#0c143d]/80 p-8 shadow-xl">
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src={assets.brandMark}
                  alt="GameVerse"
                  className="h-10 w-10"
                  loading="lazy"
                />
                <span className="text-2xl font-semibold">GameVerse</span>
              </div>
              <p className="max-w-xl text-sm text-white/75">
                GameVerse — Where every gamer levels up! From epic AAA adventures to
                indie gems, grab the hottest deals on PC, Xbox, PlayStation &
                Nintendo. Play more, pay less. 🎮
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xl font-semibold">My Account</p>
              <Link href="/user/login" className="block text-sm text-white/80">
                My Account
              </Link>
              <Link href="/user/orders" className="block text-sm text-white/80">
                My Orders
              </Link>
            </div>

            <div className="space-y-3">
              <p className="text-xl font-semibold">Support</p>
              <Link href="/terms" className="block text-sm text-white/80">
                Terms and conditions
              </Link>
              <Link href="/privacy" className="block text-sm text-white/80">
                Privacy and cookie policy
              </Link>
              <Link href="/refunds" className="block text-sm text-white/80">
                Refund policy
              </Link>
            </div>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">
              Copyright GameVerse.com 2025, all rights reserved
            </p>
            <div className="flex items-center gap-3">
              {assets.socials.map((icon) => (
                <img
                  key={icon}
                  src={icon}
                  alt="Social icon"
                  className="h-8 w-8"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
