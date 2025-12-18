"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface Publisher {
  id?: string;
  name?: string;
  email?: string;
}

interface PublisherContextType {
  publisher: Publisher | null;
  setPublisherData: (publisher: Publisher) => void;
  clearPublisher: () => void;
}

const PublisherContext = createContext<PublisherContextType | undefined>(
  undefined
);

export function PublisherProvider({ children }: { children: ReactNode }) {
  const [publisher, setPublisher] = useState<Publisher | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem("publisher");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setPublisherData = (publisherData: Publisher) => {
    setPublisher(publisherData);
    try {
      localStorage.setItem("publisher", JSON.stringify(publisherData));
    } catch {}
  };

  const clearPublisher = () => {
    setPublisher(null);
    try {
      localStorage.removeItem("publisher");
    } catch {}
  };

  return (
    <PublisherContext.Provider
      value={{ publisher, setPublisherData, clearPublisher }}
    >
      {children}
    </PublisherContext.Provider>
  );
}

export function usePublisher() {
  const ctx = useContext(PublisherContext);
  if (!ctx)
    throw new Error("usePublisher must be used inside PublisherProvider");
  return ctx;
}
