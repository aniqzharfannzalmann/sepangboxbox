"use client";

import { useState } from "react";

export function ShareResultButton({ title }: { title: string }) {
  const [message, setMessage] = useState("Share result");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} · Sepang Box Box`, url });
        setMessage("Shared");
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      setMessage("Copy link manually");
    }
    window.setTimeout(() => setMessage("Share result"), 1800);
  }

  return <button type="button" onClick={share} className="text-caption text-primary underline underline-offset-4">{message}</button>;
}
