"use client";

import Link from "next/link";
import { useAuth } from "../app/context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();

  // ❗ Chỉ render user khi nó tồn tại (sau khi client load)
  const userName = typeof window !== "undefined" ? user?.name : null;

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-gray-900 text-white shadow">
      {/* LEFT */}
      <div className="flex items-center gap-6">
        <Link href="/add-game" className="hover:text-yellow-300">
          Game Hub
        </Link>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6">
        <Link href="/" className="hover:text-yellow-300">
          Home
        </Link>

        <Link href="game/create/" className="hover:text-yellow-300">
          Thêm Game
        </Link>

        {/* SAFEST: load user chỉ khi client có window */}
        {userName && <span className="font-medium">Xin chào {userName}</span>}

        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
        >
          <Link href="/login">Logout</Link>
        </button>
      </div>
    </nav>
  );
}
