import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { fetchSteamAppById, fetchSteamApps } from "@/lib/steam-apps";
import { ProductActions } from "@/components/StoreActions";
import { ReportButton } from "@/components/ReportButton";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { applyStorePromotionsToUsd, fetchActiveStorePromotions } from "@/lib/store-promotions";

const staticProduct = {
  slug: "black-myth-wukong",
  title: "Black Myth: Wukong",
  price: "$59.99",
  hero: "/assets/1d6d5ae07fe3da8267a6f757f03f02f18eff9f08.png",
  cover: "/assets/ba7d71f219e8bef3f9455d55abf1a5dec3a20e1d.png",
  ratingIcon: "/assets/0edf57aebdd94b78202290f6dcae0459bfe5b4b4.png",
  gallery: [
    "/assets/41257b534936f9a3c9376f415acb8f44d64be4bd.png",
    "/assets/82dbcac61b11c77ced4b7b8e01436a85748c7432.png",
    "/assets/ade3f8374a32d9c832eed8e7c34accadfdc86d87.png",
    "/assets/05d783cce6ca28a9bb202198b4b629201043fd0e.png",
    "/assets/ab5db46fa48ae418fb1e714c94f7d5a69398dd91.png",
    "/assets/c13a55725563ccfca7427c9cdd090efa824d66b8.png",
  ],
  summary:
    "Black Myth: Wukong is an action RPG rooted in Chinese mythology. Venture as the Destined One to uncover the truth behind the legend.",
  meta: {
    players: "Single-Player",
    genre: "Action, Adventure, RPG",
    features: "Cloud Saves, Controller Support",
    developer: "Game Science",
    publisher: "Game Science",
    release: "08/20/24",
  },
  requirements: {
    minimum: {
      os: "Windows 10 64-bit",
      cpu: "Intel Core i5-8400 / AMD Ryzen 5 1600",
      memory: "16 GB",
      gpu: "NVIDIA GeForce GTX 1060 6GB / AMD Radeon RX 580 8GB",
      directx: "11",
      storage: "130 GB",
      sound: "Windows Compatible Audio Device",
      notes:
        "HDD Supported, SSD Recommended. Specs tested with DLSS/FSR/XeSS enabled.",
    },
    recommended: {
      os: "Windows 10 64-bit",
      cpu: "Intel Core i7-9700 / AMD Ryzen 5 5500",
      memory: "16 GB",
      gpu: "NVIDIA GeForce RTX 2060 / AMD Radeon RX 5700 XT / INTEL Arc A750",
      directx: "12",
      storage: "130 GB",
      sound: "Windows Compatible Audio Device",
      notes: "SSD recommended.",
    },
  },
};

type SteamAppDetails = {
  name: string;
  steam_appid: number;
  short_description?: string;
  about_the_game?: string;
  detailed_description?: string;
  header_image?: string;
  background?: string;
  background_raw?: string;
  screenshots?: { id: number; path_thumbnail: string; path_full: string }[];
  developers?: string[];
  publishers?: string[];
  release_date?: { date?: string; coming_soon?: boolean };
  genres?: { id: string; description: string }[];
  categories?: { id: number; description: string }[];
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
  is_free?: boolean;
  price_overview?: {
    currency?: string;
    initial?: number;
    final?: number;
    discount_percent?: number;
    initial_formatted?: string;
    final_formatted?: string;
  };
  pc_requirements?: { minimum?: string; recommended?: string } | string;
};

type SteamAppDetailsResponse = Record<
  string,
  { success: boolean; data?: SteamAppDetails }
>;

function isNumericSlug(value: string) {
  return /^\d+$/.test(value);
}

function normalizeSlug(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function startsWithDigits(value: string) {
  const match = value.match(/^(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function slugToSearchQuery(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(input?: string) {
  if (!input) return "";
  const withBreaks = input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ");

  const noTags = withBreaks.replace(/<[^>]*>/g, "");
  return decodeHtmlEntities(noTags).replace(/\n{3,}/g, "\n\n").trim();
}

function toPlatforms(platforms?: SteamAppDetails["platforms"]) {
  if (!platforms) return "—";
  const entries = [
    platforms.windows ? "Windows" : null,
    platforms.mac ? "Mac" : null,
    platforms.linux ? "Linux" : null,
  ].filter(Boolean) as string[];
  return entries.length ? entries.join(", ") : "—";
}

function priceFallback(steamAppId: number) {
  const points = [9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 69.99];
  const idx = Math.abs(steamAppId) % points.length;
  return `$${points[idx].toFixed(2)}`;
}

function parseUsdLabel(label: string) {
  const match = String(label ?? "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

async function fetchSteamDetails(steamAppId: number, detailsUrl?: string) {
  const base =
    detailsUrl ?? `https://store.steampowered.com/api/appdetails?appids=${steamAppId}`;
  const url = `${base}&cc=us&l=english`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as SteamAppDetailsResponse;
    const entry = json?.[String(steamAppId)];
    if (!entry?.success || !entry.data) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const slug = normalizeSlug(resolvedParams.slug);
  const steamAppIdFromSlug = startsWithDigits(slug);
  const isSteamId = steamAppIdFromSlug !== null || isNumericSlug(slug);

  if (!isSteamId && slug !== staticProduct.slug) {
    const search = slugToSearchQuery(slug);
    if (search) {
      const results = await fetchSteamApps({ search, limit: 1 });
      const match = results[0];
      if (match?.steamAppId) {
        redirect(`/product/${match.steamAppId}`);
      }
    }

    return notFound();
  }

  if (!isSteamId) {
    const staticShots = staticProduct.gallery.map((src, idx) => ({
      id: `static-${idx}`,
      thumbnail: src,
      full: src,
    }));
    const min = staticProduct.requirements.minimum;
    const rec = staticProduct.requirements.recommended;

    return (
      <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
        <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
          <TopBar />

          <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="relative h-[420px] overflow-hidden rounded-[20px] shadow-2xl">
                <Image
                  src={staticProduct.cover}
                  alt={staticProduct.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-white/10">
                  <img
                    src={staticProduct.ratingIcon}
                    alt="Rating"
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="text-sm text-white/70">
                  Nudity, Strong Violence, Use of tobacco and drugs
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <p className="text-4xl font-bold">{staticProduct.title}</p>
                <p className="text-xl text-white/80">
                  {staticProduct.price} USD
                </p>
              </div>
              <p className="text-white/80 leading-relaxed">
                {staticProduct.summary}
              </p>

              <ProductActions
                item={{
                  slug: staticProduct.slug,
                  name: staticProduct.title,
                  image: staticProduct.cover,
                  priceLabel: staticProduct.price,
                  originalPriceLabel: null,
                }}
              />

              <div className="grid gap-3 text-sm text-white/85">
                <InfoRow label="Players" value={staticProduct.meta.players} />
                <InfoRow label="Genre" value={staticProduct.meta.genre} />
                <InfoRow label="Features" value={staticProduct.meta.features} />
                <InfoRow label="Developer" value={staticProduct.meta.developer} />
                <InfoRow label="Publisher" value={staticProduct.meta.publisher} />
                <InfoRow label="Release Date" value={staticProduct.meta.release} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Requirements</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <ReqCard title="Minimum" data={min} />
              <ReqCard title="Recommended" data={rec} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">Screenshots</h2>
            <ScreenshotGallery items={staticShots} />
          </section>
        </div>
      </div>
    );
  }

  const steamAppId = steamAppIdFromSlug ?? Number(slug);
  const record = await fetchSteamAppById(steamAppId);
  const details = await fetchSteamDetails(steamAppId, record?.detailsUrl);

  const title = details?.name ?? record?.name ?? `App ${steamAppId}`;
  const hero =
    details?.background_raw ??
    details?.background ??
    details?.header_image ??
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
  const cover = details?.header_image ?? hero;
  const shortDescription =
    stripHtml(details?.short_description) ||
    stripHtml(details?.about_the_game) ||
    stripHtml(details?.detailed_description) ||
    "No description available.";

  const genres = details?.genres?.map((g) => g.description).filter(Boolean) ?? [];
  const genreText = genres.length ? genres.slice(0, 4).join(", ") : "—";

  const categoryText = details?.categories
    ?.map((c) => c.description)
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");

  const developerText = details?.developers?.join(", ") ?? "—";
  const publisherText = details?.publishers?.join(", ") ?? "—";
  const releaseText = details?.release_date?.date ?? "—";
  const platformsText = toPlatforms(details?.platforms);

  const priceOverview = details?.price_overview;
  const isFree = Boolean(details?.is_free);
  const priceText = isFree
    ? "Free"
    : priceOverview?.final_formatted || priceFallback(steamAppId);
  const originalText =
    priceOverview?.discount_percent && priceOverview?.discount_percent > 0
      ? priceOverview.initial_formatted
      : undefined;
  const discountText =
    priceOverview?.discount_percent && priceOverview.discount_percent > 0
      ? `-${priceOverview.discount_percent}%`
      : undefined;

  const storePromos = await fetchActiveStorePromotions();

  const baseUsd =
    !isFree && (typeof priceOverview?.final === "number" ? priceOverview.final / 100 : null);
  const labelUsd = !isFree ? parseUsdLabel(priceText) : null;
  const effectiveUsd = typeof baseUsd === "number" ? baseUsd : labelUsd;

  const storeApplied =
    typeof effectiveUsd === "number"
      ? applyStorePromotionsToUsd(effectiveUsd, storePromos)
      : { priceUsd: effectiveUsd ?? 0, discountLabel: null };

  const storeDiscountActive =
    !isFree &&
    typeof effectiveUsd === "number" &&
    storeApplied.discountLabel &&
    storeApplied.priceUsd < effectiveUsd;

  const finalPriceText = storeDiscountActive
    ? `$${storeApplied.priceUsd.toFixed(2)}`
    : priceText;

  // If store promo applies, show the price before store promo as the "original" price.
  // (This can be the Steam final price, even if Steam itself has a discount.)
  const finalOriginalText = storeDiscountActive ? priceText : originalText;
  const finalDiscountText = storeDiscountActive
    ? storeApplied.discountLabel
    : discountText;

  const shots = details?.screenshots?.slice(0, 8) ?? [];
  const shotItems = shots.map((shot) => ({
    id: shot.id,
    thumbnail: shot.path_thumbnail || shot.path_full,
    full: shot.path_full,
  }));

  const reqs = details?.pc_requirements;
  const minimum =
    typeof reqs === "object" && reqs ? stripHtml(reqs.minimum) : "";
  const recommended =
    typeof reqs === "object" && reqs ? stripHtml(reqs.recommended) : "";

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white -mx-5 sm:-mx-10">
      <div className="flex w-full flex-col gap-10 px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <TopBar />

        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0c143d]/70 shadow-2xl">
          <Image
            src={hero}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070f2b]/20 via-[#070f2b]/70 to-[#070f2b]" />
          <div className="relative grid gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
            <div className="space-y-4">
              <div className="relative h-[420px] overflow-hidden rounded-[20px] border border-white/10 shadow-2xl">
                <Image
                  src={cover}
                  alt={title}
                  fill
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  AppID {steamAppId}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {platformsText}
                </span>
                {categoryText ? (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    {categoryText}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-4xl font-bold">{title}</p>
                <div className="flex items-center gap-3 text-lg text-white/85">
                  {finalOriginalText ? (
                    <span className="text-white/50 line-through">
                      {finalOriginalText}
                    </span>
                  ) : null}
                  <span className="text-2xl font-semibold text-white">
                    {finalPriceText}
                  </span>
                  {finalDiscountText ? (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1b1a55]">
                      {finalDiscountText}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="text-white/80 leading-relaxed">{shortDescription}</p>

              <ProductActions
                item={{
                  steamAppId,
                  name: title,
                  image: cover,
                  priceLabel: finalPriceText,
                  originalPriceLabel: finalOriginalText ?? null,
                }}
              />
              <div className="flex flex-wrap gap-3">
                <ReportButton
                  targetType="game"
                  targetId={String(steamAppId)}
                  targetGameType="steam"
                  label="Report game"
                />
              </div>

              <div className="grid gap-3 text-sm text-white/85">
                <InfoRow label="Genres" value={genreText} />
                <InfoRow label="Developer" value={developerText} />
                <InfoRow label="Publisher" value={publisherText} />
                <InfoRow label="Release Date" value={releaseText} />
              </div>

              <Link
                href="/browse"
                className="inline-flex w-fit items-center gap-2 text-sm text-white/70 hover:text-white"
              >
                <span className="rounded-full border border-white/20 px-3 py-1">
                  Back to Browse
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">About the game</h2>
          <p className="max-w-5xl whitespace-pre-line text-white/80 leading-relaxed">
            {stripHtml(details?.about_the_game) ||
              stripHtml(details?.detailed_description) ||
              shortDescription}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Screenshots</h2>
          <ScreenshotGallery items={shotItems} />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">System Requirements (PC)</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <TextCard title="Minimum" text={minimum || "Not available."} />
            <TextCard title="Recommended" text={recommended || "Not available."} />
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
      <span className="text-white/60">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

type Req = {
  os: string;
  cpu: string;
  memory: string;
  gpu: string;
  directx: string;
  storage: string;
  sound: string;
  notes: string;
};

function ReqCard({ title, data }: { title: string; data: Req }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1430] p-5 shadow-xl space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ReqRow label="OS version" value={data.os} />
      <ReqRow label="CPU" value={data.cpu} />
      <ReqRow label="Memory" value={data.memory} />
      <ReqRow label="GPU" value={data.gpu} />
      <ReqRow label="DirectX" value={data.directx} />
      <ReqRow label="Storage" value={data.storage} />
      <ReqRow label="SoundCard" value={data.sound} />
      <ReqRow label="Notes" value={data.notes} />
    </div>
  );
}

function ReqRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 pb-2">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

function TextCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1430] p-5 shadow-xl space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="whitespace-pre-line text-sm text-white/80 leading-relaxed">
        {text}
      </p>
    </div>
  );
}
