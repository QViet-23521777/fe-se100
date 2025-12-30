"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#070f2b] text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c143d]/70 p-8 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-semibold">Forgot your password?</h1>
        <p className="mt-2 text-sm text-white/70">
          This project doesn’t have password reset wired up yet. For now, contact
          your admin or create a new account.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[10px] bg-[#535c91] px-4 py-4 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            required
          />
          <button
            type="submit"
            className="w-full rounded-[10px] bg-[#1b1a55] px-4 py-3 text-center text-lg font-semibold text-white shadow"
          >
            Send reset link
          </button>

          {submitted ? (
            <div className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              If password reset is enabled later, an email will be sent to{" "}
              <span className="font-semibold text-white">{email}</span>.
            </div>
          ) : null}
        </form>

        <div className="mt-6 text-sm text-white/80">
          <Link href="/user/login" className="underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

