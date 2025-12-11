"use client";

type GameCardProps = {
  title: string;
  image?: string | null; // optional
  price: number;
  salePrice: number;
};

export const GameCard = ({ title, image, price, salePrice }: GameCardProps) => {
  const discount = Math.round(((price - salePrice) / price) * 100);

  return (
    <div
      className="glass card-shadow rounded-xl overflow-hidden border border-border-dark
                    transition hover:scale-[1.03] hover:shadow-xl"
    >
      {/* Chỉ render ảnh khi có hình */}
      {image && image.trim() !== "" && (
        <img
          src={image}
          alt={title}
          className="w-full h-48 object-cover rounded-t-xl"
        />
      )}

      <div className="p-5 flex flex-col gap-3">
        <p className="text-lg font-semibold line-clamp-1">{title}</p>

        <div className="flex items-center gap-3">
          <span className="text-light-200 line-through text-sm">${price}</span>
          <span className="text-primary font-bold">${salePrice}</span>
          <span className="text-red-400 text-sm font-semibold">
            -{discount}%
          </span>
        </div>

        <button
          className="bg-primary text-black font-semibold px-4 py-2 rounded-lg 
                           hover:bg-primary/80 transition"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
};
