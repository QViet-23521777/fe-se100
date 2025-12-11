"use client";
type SearchProps = {
  Genre?: false;
  Publisher?: false;
};
export const Search = ({ Genre = false, Publisher = false }: SearchProps) => {
  return (
    <div className="w-full flex items-center gap-8 max-w-md mx-auto">
      <InputField placeholder="Search games..." />
      {Genre && <InputField placeholder="Genre..." />}
      {Publisher && <InputField placeholder="Publisher ID..." />}

      <button
        className="px-5 py-2 rounded-xl bg-cyan-400 text-black font-medium 
                    hover:bg-cyan-300 transition-all active:scale-95"
      >
        Search
      </button>
    </div>
  );
};
const InputField = ({ placeholder }: { placeholder: string }) => (
  <div className="relative w-full">
    <input
      type="text"
      placeholder="Search products..."
      className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 
                     text-white placeholder-white/40 focus:outline-none 
                     focus:ring-2 focus:ring-cyan-400/50 transition-all"
    />
  </div>
);
