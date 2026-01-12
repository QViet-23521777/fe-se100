import type { Metadata } from "next";
import { Schibsted_Grotesk, Martian_Mono } from "next/font/google";
import LightRays from "../components/LightRays";
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted-grotesk",
  subsets: ["latin"],
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GameVerse",
  description: "An online game store built by Group 1!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Speed up first paint for external images we always hit (Steam headers) */}
        <link rel="preconnect" href="https://cdn.cloudflare.steamstatic.com" />
        <link rel="preconnect" href="https://store.akamai.steamstatic.com" />
        <link rel="dns-prefetch" href="https://cdn.cloudflare.steamstatic.com" />
        <link rel="dns-prefetch" href="https://store.akamai.steamstatic.com" />
      </head>
      <body
        className={`${schibstedGrotesk.variable} ${martianMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <StoreProvider>
            <div className="absolute inset-0 top-0 z-[-1] min-h-screen">
              <LightRays
                raysOrigin="top-center"
                raysColor="#00ffff"
                raysSpeed={1.5}
                lightSpread={0.8}
                rayLength={1.2}
                followMouse={true}
                mouseInfluence={0.1}
                noiseAmount={0.1}
                distortion={0.05}
                className="custom-rays"
              />
            </div>

            <main>{children}</main>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

