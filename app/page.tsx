// app/page.tsx
import { Search } from "@/components/Search";
import { GameList } from "@/components/GameList";

export default function Home() {
  return (
    <section>
      <h1 className="text-center mb-8">Game Hub</h1>
      <Search />

      {/* Hiển thị game đang giảm giá */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-white mb-6 px-6">
          🔥 Games on Sale
        </h2>
        <GameList onSale={true} />
      </div>
    </section>
  );
}
