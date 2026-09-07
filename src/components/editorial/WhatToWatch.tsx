import { StatusNotice } from "@/components/StatusNotice";
import { BadgePill, SectionLabel } from "@/components/ui/primitives";
import type { WhatToWatch as WhatToWatchData } from "@/lib/f1/editorial";

export function WhatToWatch({ data }: { data: WhatToWatchData }) {
  return (
    <section aria-labelledby="what-to-watch" className="border border-hairline p-md sm:p-lg">
      <div className="flex flex-wrap items-center gap-xxs">
        <SectionLabel>Before the session</SectionLabel>
        <BadgePill tone="info">Context</BadgePill>
      </div>
      <h2 id="what-to-watch" className="text-display-md text-ink mt-xxs">What to watch</h2>
      <p className="text-body-md text-body mt-xs max-w-[62ch]">{data.headline}</p>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-xs mt-md">
        {data.items.map((item) => (
          <li key={item.key} className="border border-hairline p-sm">
            <h3 className="text-body-md text-ink">{item.title}</h3>
            <p className="text-body-sm text-body mt-xxs">{item.body}</p>
          </li>
        ))}
      </ul>
      {(data.weatherNote || data.sprintNote) && (
        <div className="flex flex-col gap-xxs mt-md">
          {data.weatherNote && <p className="text-body-sm text-body"><span className="text-ink">Weather:</span> {data.weatherNote}</p>}
          {data.sprintNote && <p className="text-body-sm text-body"><span className="text-ink">Format:</span> {data.sprintNote}</p>}
        </div>
      )}
      {data.warnings.length > 0 && (
        <StatusNotice role="note" className="mt-md">
          Some context is unavailable: {data.warnings.join(" ")}
        </StatusNotice>
      )}
    </section>
  );
}
