"use client";

import { useState } from "react";
import { ReportDialog } from "@/components/ReportDialog";
import { useAuth } from "@/app/context/AuthContext";

type Props = {
  label?: string;
  gameName?: string;
  targetId: string;
  targetGameType: "steam" | "custom";
};

export function ReportGameButton({ label = "Report game", gameName, targetId, targetGameType }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (user?.accountType !== "customer" && user?.accountType !== "publisher") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        {label}
      </button>
      <ReportDialog
        open={open}
        onClose={() => setOpen(false)}
        targetType="game"
        targetId={targetId}
        targetGameType={targetGameType}
        title={gameName ? `Report “${gameName}”` : "Report game"}
      />
    </>
  );
}

