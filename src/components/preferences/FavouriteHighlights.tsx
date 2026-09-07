"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { TeamStripe } from "@/components/team/TeamStripe";
import { DriverPortrait } from "@/components/driver/DriverPortrait";
import { SectionLabel } from "@/components/ui/primitives";
import { getServerFavorites, readFavorites, subscribeToFavorites } from "@/lib/preferences/favorites";
import type { ConstructorStanding, DriverStanding } from "@/lib/f1/types";

export function FavouriteHighlights({
  drivers,
  constructors,
}: {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
}) {
  const favorites = useSyncExternalStore(
    subscribeToFavorites,
    readFavorites,
    getServerFavorites,
  );
  const followedDrivers = drivers.filter((entry) => favorites.drivers.includes(entry.driver.id)).slice(0, 3);
  const followedConstructors = constructors.filter((entry) => favorites.constructors.includes(entry.constructor.id)).slice(0, 3);

  if (followedDrivers.length === 0 && followedConstructors.length === 0) return null;

  return (
    <section aria-labelledby="your-favourites" className="border border-hairline p-md sm:p-lg">
      <SectionLabel>Your favourites</SectionLabel>
      <h2 id="your-favourites" className="text-display-md text-ink mt-xxs">Keep an eye on them</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xs mt-md">
        {followedDrivers.map((entry) => (
          <article key={entry.driver.id} className="border border-hairline p-sm flex items-center gap-xs">
            <DriverPortrait
              driverId={entry.driver.id}
              name={entry.driver.fullName}
              constructorId={entry.constructors[0]?.id}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <p className="text-body-md text-ink truncate">{entry.driver.fullName}</p>
              <p className="text-caption text-muted truncate">P{entry.position} · {entry.points} pts · {entry.wins} {entry.wins === 1 ? "win" : "wins"}</p>
            </div>
            <Link href={`/compare?a=${entry.driver.id}`} className="text-caption text-primary underline underline-offset-4 shrink-0">Compare</Link>
          </article>
        ))}
        {followedConstructors.map((entry) => (
          <article key={entry.constructor.id} className="border border-hairline p-sm flex items-center gap-xs">
            <TeamStripe constructorId={entry.constructor.id} width={8} />
            <div className="min-w-0 flex-1">
              <p className="text-body-md text-ink truncate">{entry.constructor.name}</p>
              <p className="text-caption text-muted truncate">P{entry.position} · {entry.points} pts · {entry.wins} {entry.wins === 1 ? "win" : "wins"}</p>
            </div>
            <Link href={`/teams/${entry.constructor.id}`} className="text-caption text-primary underline underline-offset-4 shrink-0">Team</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
