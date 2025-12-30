import Link from "next/link";

import CarouselRow, { type CarouselItem } from "./CarouselRow";
import HeroSlider, { type HeroSlide } from "./HeroSlider";

type UpcomingGame = {
  id: string;
  title: string;
  price: number;
  imageSrc: string;
};

type Category = {
  id: string;
  title: string;
  imageSrc: string;
};

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "featured-1",
    title: "The Last of Us Part II",
    description:
      "Five years after the events of The Last of Us, Ellie embarks on another journey through post‑apocalyptic America on a mission of vengeance against a mysterious militia.",
    price: 49.99,
    imageSrc: "/landing/hero-1.svg",
  },
  {
    id: "featured-2",
    title: "Cyberpunk 2077",
    description:
      "Enter Night City — a megalopolis obsessed with power, glamour, and body modification. Become a cyber‑enhanced mercenary and write your legend.",
    price: 29.24,
    imageSrc: "/landing/hero-2.svg",
  },
];

const UPCOMING: UpcomingGame[] = [
  {
    id: "upcoming-1",
    title: "Mafia: The Old Country",
    price: 49.99,
    imageSrc: "/landing/poster-1.svg",
  },
  {
    id: "upcoming-2",
    title: "EA Sports FC 26",
    price: 69.99,
    imageSrc: "/landing/poster-2.svg",
  },
  {
    id: "upcoming-3",
    title: "Hell is Us",
    price: 29.99,
    imageSrc: "/landing/poster-3.svg",
  },
];

const TRENDING: CarouselItem[] = [
  {
    id: "trend-1",
    title: "Ready or Not",
    price: 28.99,
    imageSrc: "/landing/poster-4.svg",
  },
  {
    id: "trend-2",
    title: "Cyberpunk 2077",
    price: 29.24,
    originalPrice: 44.99,
    discountPercent: 65,
    imageSrc: "/landing/poster-5.svg",
  },
  {
    id: "trend-3",
    title: "R.E.P.O.",
    price: 5.79,
    imageSrc: "/landing/poster-6.svg",
  },
  {
    id: "trend-4",
    title: "No Man's Sky",
    price: 23.99,
    originalPrice: 59.99,
    discountPercent: 60,
    imageSrc: "/landing/poster-2.svg",
  },
  {
    id: "trend-5",
    title: "Hades",
    price: 9.99,
    originalPrice: 24.99,
    discountPercent: 60,
    imageSrc: "/landing/poster-1.svg",
  },
];

const BESTSELLERS: CarouselItem[] = [
  {
    id: "best-1",
    title: "Red Dead Redemption II",
    price: 47.99,
    originalPrice: 59.99,
    discountPercent: 20,
    imageSrc: "/landing/poster-5.svg",
  },
  {
    id: "best-2",
    title: "Grand Theft Auto V",
    price: 13.49,
    originalPrice: 29.99,
    discountPercent: 55,
    imageSrc: "/landing/poster-3.svg",
  },
  {
    id: "best-3",
    title: "Ghost of Tsushima",
    price: 34.99,
    originalPrice: 69.99,
    discountPercent: 50,
    imageSrc: "/landing/poster-4.svg",
  },
  {
    id: "best-4",
    title: "Elden Ring",
    price: 41.99,
    originalPrice: 59.99,
    discountPercent: 30,
    imageSrc: "/landing/poster-6.svg",
  },
];

const BEST_DEALS: CarouselItem[] = [
  {
    id: "deal-1",
    title: "It Takes Two",
    price: 11.99,
    originalPrice: 39.99,
    discountPercent: 70,
    imageSrc: "/landing/poster-1.svg",
  },
  {
    id: "deal-2",
    title: "Forza Horizon 5 – Premium",
    price: 10.3,
    originalPrice: 51.41,
    discountPercent: 80,
    imageSrc: "/landing/poster-2.svg",
  },
  {
    id: "deal-3",
    title: "A Way Out",
    price: 6.99,
    originalPrice: 29.99,
    discountPercent: 75,
    imageSrc: "/landing/poster-3.svg",
  },
];

const CATEGORIES: Category[] = [
  { id: "cat-action", title: "Action", imageSrc: "/landing/cat-1.svg" },
  { id: "cat-adventure", title: "Adventure", imageSrc: "/landing/cat-2.svg" },
  { id: "cat-arcade", title: "Arcade", imageSrc: "/landing/cat-3.svg" },
  { id: "cat-fps", title: "FPS", imageSrc: "/landing/cat-4.svg" },
  { id: "cat-fighting", title: "Fighting", imageSrc: "/landing/cat-5.svg" },
  { id: "cat-rpg", title: "RPG", imageSrc: "/landing/cat-6.svg" },
  { id: "cat-single", title: "Single‑Player", imageSrc: "/landing/cat-1.svg" },
  { id: "cat-vr", title: "VR", imageSrc: "/landing/cat-2.svg" },
];

function SectionHeading({
  title,
  id,
}: {
  title: string;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="flex items-center gap-2 text-3xl font-bold">
        {title}
        <ArrowRightIcon className="h-5 w-5 text-white/60" />
      </h2>
    </div>
  );
}

function UpcomingGrid({ games }: { games: UpcomingGame[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <article
          key={game.id}
          className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
            <img
              src={game.imageSrc}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white/90">
                {game.title}
              </p>
              <p className="mt-2 font-martian-mono text-xs text-white/70">
                ${game.price.toFixed(2)}
              </p>
            </div>

            <button className="shrink-0 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15">
              Pre‑Order
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function FeatureCard({
  title,
  description,
  imageSrc,
  ctaLabel = "Browse",
}: {
  title: string;
  description: string;
  imageSrc: string;
  ctaLabel?: string;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="relative h-[210px] bg-gradient-to-br from-white/5 to-white/0">
        <img
          src={imageSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-7">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {description}
        </p>

        <button className="mt-6 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/15">
          {ctaLabel}
        </button>
      </div>
    </article>
  );
}

function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {categories.map((category) => (
        <Link
          key={category.id}
          href="/"
          className="group relative min-h-[120px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <img
            src={category.imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050b2a]/70 to-[#050b2a]/20" />
          <div className="relative flex h-full items-center justify-center px-6 py-10">
            <p className="text-xl font-semibold tracking-tight">
              {category.title}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div id="home" className="flex flex-col gap-14">
      <HeroSlider slides={HERO_SLIDES} />

      <section aria-labelledby="upcoming-title" className="flex flex-col gap-6">
        <SectionHeading title="Upcoming Games" id="upcoming-title" />
        <UpcomingGrid games={UPCOMING} />
      </section>

      <section id="browse" className="flex flex-col gap-10">
        <CarouselRow id="trending" title="Trending" items={TRENDING} />
        <CarouselRow id="bestsellers" title="Bestsellers" items={BESTSELLERS} />
      </section>

      <section id="deals" className="flex flex-col gap-10">
        <CarouselRow id="best-deals" title="Best Deals" items={BEST_DEALS} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FeatureCard
            title="Sales & Specials"
            description="Save big on hit titles and hidden gems. There’s always something on sale at GameVerse Store!"
            imageSrc="/landing/feature-sales.svg"
          />
          <FeatureCard
            title="Free Games"
            description="Explore free and free‑to‑play games from our curated collection."
            imageSrc="/landing/feature-free.svg"
          />
        </div>
      </section>

      <section id="categories" aria-labelledby="categories-title" className="flex flex-col gap-6">
        <SectionHeading title="Categories" id="categories-title" />
        <CategoryGrid categories={CATEGORIES} />
      </section>
    </div>
  );
}

