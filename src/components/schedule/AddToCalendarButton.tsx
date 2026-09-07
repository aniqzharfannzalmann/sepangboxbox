"use client";

import { useState } from "react";

function icsDate(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function AddToCalendarButton({
  title,
  startsAtIso,
  endsAtIso,
}: {
  title: string;
  startsAtIso: string;
  endsAtIso: string;
}) {
  const [saved, setSaved] = useState(false);

  function download() {
    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sepang Box Box//Race Weekend//EN",
      "BEGIN:VEVENT",
      `UID:${title.replace(/[^a-z0-9]/gi, "-")}-${startsAtIso}@sepang-box-box`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(startsAtIso)}`,
      `DTEND:${icsDate(endsAtIso)}`,
      `SUMMARY:${title}`,
      "DESCRIPTION:Unofficial Sepang Box Box race-weekend reminder. Check official venue information before travelling.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }

  return (
    <button type="button" onClick={download} className="text-caption text-muted hover:text-ink underline underline-offset-4">
      {saved ? "Calendar file downloaded" : "Add to calendar"}
    </button>
  );
}
