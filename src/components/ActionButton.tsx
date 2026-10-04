"use client";
import { useTransition } from "react";

export function ActionButton({ action, label, pendingLabel, className = "btn-cta" }: { action: () => Promise<void>; label: string; pendingLabel?: string; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={className} disabled={pending} onClick={() => start(() => action())}>{pending ? (pendingLabel ?? label) : label}</button>
  );
}
