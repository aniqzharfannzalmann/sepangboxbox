/**
 * Sepang International Circuit — Grandstand & Spectator Vantage Guide Data
 * Realistic fan insights for the 2026 Malaysian Grand Prix weekend.
 */

export interface GrandstandRating {
  overtaking: number; // 1 to 10
  shelter: number; // 1 to 10 (rain and sun protection)
  bigScreen: number; // 1 to 10
  photography: number; // 1 to 10
}

export type GrandstandTag = "overtaking" | "shelter" | "budget" | "pit-stops";

export interface GrandstandData {
  id: string;
  name: string;
  shortLabel: string;
  badge: string;
  badgeTone: "primary" | "neutral" | "warning";
  location: string;
  facing: string;
  approxPriceRm: string;
  roofStatus: "Fully Covered" | "Partially Covered" | "Open Hillstand";
  tags: GrandstandTag[];
  ratings: GrandstandRating;
  keyView: string;
  sunAndRainOutlook: string;
  whoIsItFor: string;
  proTip: string;
  /** SVG Coordinates in Sepang viewBox: 17.1 45 461.3 408.5 */
  mapCoords: {
    x: number;
    y: number;
    /** Sightline cone polygon points to visualize what the grandstand sees on track */
    conePoints?: string;
  };
}

export const SEPANG_GRANDSTANDS: GrandstandData[] = [
  {
    id: "k1",
    name: "K1 Grandstand",
    shortLabel: "K1 (Turn 1 & 2)",
    badge: "FAN FAVOURITE · THE OVERTAKE ARENA",
    badgeTone: "primary",
    location: "Outside Turn 1 & Turn 2 uphill switchback",
    facing: "Facing North-East (towards Turn 1 apex and Turn 2 exit)",
    approxPriceRm: "RM 650 – RM 980",
    roofStatus: "Fully Covered",
    tags: ["overtaking"],
    ratings: {
      overtaking: 10,
      shelter: 7,
      bigScreen: 9,
      photography: 10,
    },
    keyView:
      "The heaviest braking zone in F1: cars decelerate from 325 km/h to 80 km/h in 2.5s down into Turn 1, then climb the off-camber Turn 2 uphill switchback. Lap 1 chaos is practically guaranteed.",
    sunAndRainOutlook:
      "Covered canopy roof protects from high noon sun. However, the lowest 5 rows can catch early morning sun and driving side-wind rain during 4:00 PM storms.",
    whoIsItFor:
      "Die-hard racecraft purists who want wheel-to-wheel battles, tyre smoke, late-braking dive-bombs, and guaranteed opening lap excitement.",
    proTip:
      "Book seats in Row K and above. You will sit high enough to see over the safety fencing, avoid wind-blown rain, and catch both Turn 1 entry and Turn 2 uphill exit in one panoramic sweep.",
    mapCoords: {
      x: 145,
      y: 435,
      conePoints: "145,435 180,410 205,445",
    },
  },
  {
    id: "main-north",
    name: "Main Grandstand North",
    shortLabel: "Main North (Pit Straight)",
    badge: "PREMIUM · PIT LANE & PODIUM",
    badgeTone: "primary",
    location: "Fronting the Start/Finish Straight and Pit Building",
    facing: "Facing West / Pit Garages (double-deck sheltered structure)",
    approxPriceRm: "RM 950 – RM 1,950",
    roofStatus: "Fully Covered",
    tags: ["shelter", "pit-stops"],
    ratings: {
      overtaking: 7,
      shelter: 10,
      bigScreen: 10,
      photography: 8,
    },
    keyView:
      "Full view of the starting grid, national anthem ceremony, 2.0s pit stops, start-line burnout tyre smoke, chequered flag finish, and the champagne podium celebration.",
    sunAndRainOutlook:
      "10/10 shelter. The iconic double-sided canopy roof completely shields you from blistering 35°C afternoon heat and torrential tropical monsoon thunderstorms.",
    whoIsItFor:
      "First-timers and fans who want maximum comfort, full protection from the elements, the roaring acoustics of the pit wall, and proximity to race amenities.",
    proTip:
      "Upper tier (Tower / Crystal zone) offers the best view over the pit wall right into the team garages during pit stops. Bring hearing protection — the roof traps the engine noise gloriously.",
    mapCoords: {
      x: 215,
      y: 330,
      conePoints: "215,330 185,295 165,345",
    },
  },
  {
    id: "main-south",
    name: "Main Grandstand South",
    shortLabel: "Main South (Turn 15)",
    badge: "DRAMA · THE BACK STRAIGHT & T15",
    badgeTone: "warning",
    location: "Facing the 920m Back Straight into Turn 15 Hairpin",
    facing: "Facing East (towards Turn 14 exit and Turn 15 hairpin apex)",
    approxPriceRm: "RM 850 – RM 1,450",
    roofStatus: "Fully Covered",
    tags: ["overtaking", "shelter"],
    ratings: {
      overtaking: 9,
      shelter: 10,
      bigScreen: 8,
      photography: 9,
    },
    keyView:
      "Watch jentera exit Turn 14, reach 320+ km/h down the Back Straight with DRS open, and brake brutally into the tricky off-camber Turn 15 hairpin — site of Vettel's infamous 'Multi 21' pass on Webber in 2013.",
    sunAndRainOutlook:
      "100% roof shelter. Being on the south wing, you are completely shielded from the harsh afternoon western sun and rain.",
    whoIsItFor:
      "Fans who love the final lap, last-corner lunges and want full grandstand roof comfort without missing high-speed overtakes.",
    proTip:
      "Look towards Turn 15 entry — cars often lock up their inside front tyre under braking because of the descending track camber. Perfect spot for action shots.",
    mapCoords: {
      x: 255,
      y: 275,
      conePoints: "255,275 220,235 305,225",
    },
  },
  {
    id: "f-grandstand",
    name: "F Grandstand",
    shortLabel: "F (Turn 7 & 8)",
    badge: "AERODYNAMICS · HIGH-SPEED G-FORCE",
    badgeTone: "neutral",
    location: "Overlooking Turn 7 & Turn 8 sweeping right-handers",
    facing: "Facing South-West across the infield towards the Back Straight",
    approxPriceRm: "RM 450 – RM 780",
    roofStatus: "Fully Covered",
    tags: ["shelter", "budget"],
    ratings: {
      overtaking: 6,
      shelter: 8,
      bigScreen: 7,
      photography: 9,
    },
    keyView:
      "A dual-view grandstand! In front of you, modern ground-effect F1 cars carve through Turn 7 and Turn 8 at 225 km/h, exhibiting raw aerodynamic downforce. In the distance, you can see cars rocketing down the Back Straight.",
    sunAndRainOutlook:
      "Covered permanent roof. Good breeze channel through the infield, but can feel warm during midday sun.",
    whoIsItFor:
      "Motorsport enthusiasts fascinated by cornering grip and aerodynamic speeds who want a covered seat at a more accessible ticket price.",
    proTip:
      "A quieter grandstand with shorter toilet and merchandise queues. Ideal for families and photographers looking for panning side-shots of cars pulling 3.8 lateral Gs.",
    mapCoords: {
      x: 375,
      y: 285,
      conePoints: "375,285 335,260 345,300",
    },
  },
  {
    id: "c2-hillstand",
    name: "Hillstand C2 (Covered & Grass)",
    shortLabel: "Hillstand C2 (Double Straights)",
    badge: "BEST VALUE · PICNIC VIBES",
    badgeTone: "neutral",
    location: "Natural grass hill nestled between Main Straight and Back Straight",
    facing: "360-degree elevated panoramic views of both long straights",
    approxPriceRm: "RM 180 – RM 320",
    roofStatus: "Partially Covered",
    tags: ["budget", "overtaking"],
    ratings: {
      overtaking: 8,
      shelter: 4,
      bigScreen: 6,
      photography: 8,
    },
    keyView:
      "Panoramic hilltop vantage where you see cars charging on the Main Straight to your left, and roaring down the Back Straight to your right. You feel the speed echo across the valley.",
    sunAndRainOutlook:
      "Partially shaded by permanent canopy structures, but vast areas are open natural grass. Exposed to midday tropical sun and sudden afternoon showers.",
    whoIsItFor:
      "Groups of friends, students, and budget-conscious fans who want a festival picnic mat atmosphere with great food, drinks, and casual lepak vibes.",
    proTip:
      "Pack an essentials bag: picnic mat, portable fan, sunscreen, sunglasses, cap, and a compact raincoat/poncho. Arrive early on Sunday morning to claim prime turf under the canopies!",
    mapCoords: {
      x: 315,
      y: 220,
      conePoints: "315,220 280,185 355,185",
    },
  },
];

export const FILTER_PRESETS = [
  { id: "all", label: "All Grandstands" },
  { id: "overtaking", label: "Max Overtaking" },
  { id: "shelter", label: "Covered & Weather Shield" },
  { id: "budget", label: "Value & Hillstand" },
  { id: "pit-stops", label: "Pit Lane & Podium" },
] as const;
