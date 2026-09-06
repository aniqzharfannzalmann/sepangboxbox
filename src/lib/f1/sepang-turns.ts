export interface TurnMoment {
  year: number;
  title: string;
  driver: string;
  team: string;
  description: string;
  radioQuote?: {
    speaker: string;
    text: string;
    tag?: string;
  };
}

export interface TurnData {
  id: string;
  number: string;
  shortLabel: string;
  name: string;
  type: "corner" | "straight" | "complex";
  /** Coordinates in SVG viewBox: 17.1 45 461.3 408.5 */
  x: number;
  y: number;
  gear: string;
  speedKmh: string;
  gForce?: string;
  characteristics: string;
  overtakingRating: 1 | 2 | 3 | 4 | 5;
  drsZone?: number;
  moments: TurnMoment[];
}

export interface RadioMoment {
  id: string;
  year: number;
  driverCode: string;
  driverNumber: string;
  driverName: string;
  teamName: string;
  teamColor: string;
  headline: string;
  context: string;
  dialogue: Array<{
    speaker: string;
    text: string;
    role: "driver" | "engineer" | "team_principal";
  }>;
}

export const SEPANG_TURNS: TurnData[] = [
  {
    id: "t1_2",
    number: "T1 – T2",
    shortLabel: "T1",
    name: "Turn 1 & 2 (Braking & Uphill Switchback)",
    type: "complex",
    x: 188,
    y: 434,
    gear: "Gear 2",
    speedKmh: "75 – 85 km/h",
    gForce: "-5.0G",
    overtakingRating: 5,
    characteristics:
      "Sepang's heaviest braking zone: cars decelerate from 325 km/h to 80 km/h in just 2.5 seconds, immediately feeding into a tight, uphill, off-camber left at Turn 2.",
    moments: [
      {
        year: 2013,
        title: "The 'Multi 21, Seb' Controversy",
        driver: "Sebastian Vettel & Mark Webber",
        team: "Red Bull Racing",
        description:
          "Vettel defied direct team orders to hold position behind Webber (code Multi 21), launching a bold pass around the outside of Turn 1 and taking the lead through Turn 2, sparking one of F1's most famous intra-team feuds.",
        radioQuote: {
          speaker: "Christian Horner",
          text: "This is silly Seb, come on.",
          tag: "Red Bull Team Radio",
        },
      },
      {
        year: 2016,
        title: "Opening Lap Turn 1 Collision",
        driver: "Nico Rosberg & Sebastian Vettel",
        team: "Mercedes / Ferrari",
        description:
          "Vettel lunged down the inside of Turn 1 and tagged Nico Rosberg into a spin, sending the championship leader to the back of the grid before a stunning recovery drive back to the podium.",
      },
    ],
  },
  {
    id: "t3",
    number: "T3",
    shortLabel: "T3",
    name: "Turn 3 (High-Speed Downhill Sweep)",
    type: "corner",
    x: 274,
    y: 382,
    gear: "Gear 4 / 5",
    speedKmh: "~210 km/h",
    gForce: "+2.8G",
    overtakingRating: 2,
    characteristics:
      "A long, accelerating right-hander downhill. Drivers feed in throttle out of Turn 2 while managing high lateral loads across the left-side tyres.",
    moments: [
      {
        year: 2015,
        title: "Ferrari's Tyre Management Masterclass",
        driver: "Sebastian Vettel",
        team: "Scuderia Ferrari",
        description:
          "In blistering 56°C track temperatures, Vettel showcased the superior mechanical traction and gentle tyre wear of the Ferrari SF15-T, out-strategising Mercedes.",
      },
    ],
  },
  {
    id: "t4",
    number: "T4",
    shortLabel: "T4",
    name: "Turn 4 (90° Downhill Right)",
    type: "corner",
    x: 417,
    y: 356,
    gear: "Gear 3",
    speedKmh: "~110 km/h",
    gForce: "-2.5G",
    overtakingRating: 4,
    characteristics:
      "A sharp 90-degree right-hander with the braking marker at the 100m board. A prime overtaking hotspot for late divebombs.",
    moments: [
      {
        year: 2010,
        title: "Red Bull Front Row Duel",
        driver: "Sebastian Vettel & Mark Webber",
        team: "Red Bull Racing",
        description:
          "Vettel attacked Webber around the outside into Turn 1 and held perfect traction all the way into the apex of Turn 4 to seal the race lead.",
      },
    ],
  },
  {
    id: "t5_6",
    number: "T5 – T6",
    shortLabel: "T5",
    name: "Turns 5 & 6 (The High-Speed Esses)",
    type: "complex",
    x: 382,
    y: 271,
    gear: "Gear 5 / 6",
    speedKmh: "220 – 245 km/h",
    gForce: "+4.2G",
    overtakingRating: 2,
    characteristics:
      "Sepang's fastest sequence. Demands exceptional high-speed aerodynamic downforce and tests driver neck endurance in punishing tropical humidity.",
    moments: [
      {
        year: 2017,
        title: "Record-Breaking Qualifying Lap",
        driver: "Lewis Hamilton",
        team: "Mercedes AMG",
        description:
          "Hamilton hooked up a breathtaking 1:30.076 pole lap, slicing through Turns 5 and 6 with supreme high-speed balance and commitment.",
      },
    ],
  },
  {
    id: "t7_8",
    number: "T7 – T8",
    shortLabel: "T7",
    name: "Turns 7 & 8 (Double Apex Right)",
    type: "corner",
    x: 336,
    y: 270,
    gear: "Gear 4",
    speedKmh: "~185 km/h",
    gForce: "+3.0G",
    overtakingRating: 2,
    characteristics:
      "A double-apex medium-speed right-hander with a blind exit. Rear-end stability over the kerbs is vital before climbing into the northern sector.",
    moments: [
      {
        year: 2014,
        title: "Mercedes Dominance in the Heat",
        driver: "Lewis Hamilton & Nico Rosberg",
        team: "Mercedes AMG",
        description:
          "Hamilton controlled tyre degradation impeccably through this section, building a commanding 17-second lead to claim his first career Grand Slam.",
      },
    ],
  },
  {
    id: "t9",
    number: "T9",
    shortLabel: "T9",
    name: "Turn 9 (Uphill Off-Camber Hairpin)",
    type: "corner",
    x: 279,
    y: 105,
    gear: "Gear 1 / 2",
    speedKmh: "~75 km/h",
    gForce: "-2.0G",
    overtakingRating: 3,
    characteristics:
      "Sepang's most technical uphill corner. The off-camber slope unweights the front-left wheel under heavy braking, making it the circuit's biggest lock-up hotspot.",
    moments: [
      {
        year: 2012,
        title: "Monsoon Chaos & Lock-ups",
        driver: "Multiple Drivers",
        team: "2012 F1 Grid",
        description:
          "Standing water at the Turn 9 apex caught out multiple frontrunners in torrential conditions, forcing cars into the gravel trap as rain deluged the track.",
      },
    ],
  },
  {
    id: "t11",
    number: "T11",
    shortLabel: "T11",
    name: "Turn 11 (Blind Crest Right)",
    type: "corner",
    x: 145,
    y: 86,
    gear: "Gear 3",
    speedKmh: "~130 km/h",
    gForce: "-2.8G",
    overtakingRating: 3,
    characteristics:
      "Drivers brake over a blind crest without full sight of the turn-in point, requiring complete trust in car balance and braking references.",
    moments: [
      {
        year: 2003,
        title: "Kimi's Flawless Masterclass",
        driver: "Kimi Räikkönen",
        team: "McLaren Mercedes",
        description:
          "A 23-year-old Räikkönen hit every apex with clinical precision across 56 laps, pulling a 39-second margin over his rivals.",
      },
    ],
  },
  {
    id: "t14",
    number: "T14",
    shortLabel: "T14",
    name: "Turn 14 (Gateway to the Back Straight)",
    type: "corner",
    x: 42,
    y: 271,
    gear: "Gear 2",
    speedKmh: "~85 km/h",
    gForce: "-2.2G",
    overtakingRating: 3,
    characteristics:
      "A slow, critical right hairpin. Any loss of traction on exit severely penalises top speed down the entire 927-metre back straight.",
    moments: [
      {
        year: 2017,
        title: "Verstappen's Championship-Defining Strike",
        driver: "Max Verstappen",
        team: "Red Bull Racing",
        description:
          "Verstappen shadowed Hamilton closely out of Turn 14, capitalising on DRS down the straight to execute a decisive pass for victory.",
      },
    ],
  },
  {
    id: "back_straight",
    number: "Back Straight",
    shortLabel: "DRS",
    name: "Back Straight (DRS Zone 1)",
    type: "straight",
    x: 100,
    y: 345,
    gear: "Gear 8",
    speedKmh: "320+ km/h",
    drsZone: 1,
    overtakingRating: 5,
    characteristics:
      "A 927-metre straight directly opposite the Main Grandstand. Slipstreaming and DRS make this the prime overtaking zone leading into the Turn 15 hairpin.",
    moments: [
      {
        year: 2012,
        title: "Sergio Pérez's Heroic Chase",
        driver: "Sergio Pérez",
        team: "Sauber Ferrari",
        description:
          "Pérez hunted down Fernando Alonso's Ferrari at over 0.8 seconds per lap, slipstreaming down the back straight before running slightly wide at Turn 15.",
      },
    ],
  },
  {
    id: "t15",
    number: "T15",
    shortLabel: "T15",
    name: "Turn 15 (Final Hairpin)",
    type: "corner",
    x: 400,
    y: 135,
    gear: "Gear 2",
    speedKmh: "~75 km/h",
    gForce: "-4.5G",
    overtakingRating: 5,
    characteristics:
      "The circuit's iconic hairpin directly in front of the packed Main Grandstand. Connects the back straight back into the start/finish straight.",
    moments: [
      {
        year: 2012,
        title: "Alonso's Masterclass in the Rain",
        driver: "Fernando Alonso",
        team: "Scuderia Ferrari",
        description:
          "Alonso defended heroically in an underdog Ferrari F2012 through changing weather, keeping calm when Pérez slid wide at Turn 15 with six laps remaining.",
      },
      {
        year: 2003,
        title: "The Iceman's Maiden Victory",
        driver: "Kimi Räikkönen",
        team: "McLaren Mercedes",
        description:
          "Kimi swept through the final hairpin to take the chequered flag, earning his first-ever Formula 1 Grand Prix victory at age 23.",
      },
    ],
  },
  {
    id: "main_straight",
    number: "Main Straight",
    shortLabel: "DRS",
    name: "Main Straight (DRS Zone 2 & Pit Straight)",
    type: "straight",
    x: 179,
    y: 365,
    gear: "Gear 8",
    speedKmh: "325+ km/h",
    drsZone: 2,
    overtakingRating: 5,
    characteristics:
      "A 910-metre blast past the pit wall and the Main Grandstand, housing the grid and the start/finish timing line.",
    moments: [
      {
        year: 2016,
        title: "Hamilton's Heartbreak: 'Oh no, no!'",
        driver: "Lewis Hamilton",
        team: "Mercedes AMG",
        description:
          "On Lap 43 while cruising with a 22-second lead, Hamilton's Mercedes engine erupted in flames along the pit straight, handing Daniel Ricciardo victory and swinging the World Championship to Nico Rosberg.",
        radioQuote: {
          speaker: "Lewis Hamilton",
          text: "Oh no, no! ... Ahhh!",
          tag: "Mercedes Team Radio",
        },
      },
    ],
  },
];

export const HISTORIC_RADIOS: RadioMoment[] = [
  {
    id: "multi-21",
    year: 2013,
    driverCode: "WEB",
    driverNumber: "2",
    driverName: "Mark Webber",
    teamName: "Red Bull Racing",
    teamColor: "#1e41ff",
    headline: "Multi 21, Seb. Multi 21!",
    context:
      "Lap 46, 2013 Malaysian GP. Red Bull instructed both cars to turn down engine modes and hold position (Car #2 Webber leading, Car #1 Vettel in second). Vettel ignored orders and attacked Webber into Turn 1.",
    dialogue: [
      {
        speaker: "Christian Horner",
        role: "team_principal",
        text: "This is silly Seb, come on.",
      },
      {
        speaker: "Mark Webber (Cool-down room)",
        role: "driver",
        text: "Multi 21, Seb. Multi 21.",
      },
      {
        speaker: "Sebastian Vettel",
        role: "driver",
        text: "I was faster, I passed him, I won.",
      },
    ],
  },
  {
    id: "hamilton-engine-2016",
    year: 2016,
    driverCode: "HAM",
    driverNumber: "44",
    driverName: "Lewis Hamilton",
    teamName: "Mercedes AMG Petronas",
    teamColor: "#00d2be",
    headline: "Oh no, no! Engine Fire on the Main Straight",
    context:
      "Lap 43, 2016 Malaysian GP. Leading comfortably by 22 seconds, Hamilton's Mercedes power unit spectacularly expired on the pit straight.",
    dialogue: [
      {
        speaker: "Lewis Hamilton",
        role: "driver",
        text: "Oh no, no! ... Ahhhhh!",
      },
      {
        speaker: "Peter Bonnington (Bono)",
        role: "engineer",
        text: "Engine fail Lewis, stop the car. Stop the car please.",
      },
    ],
  },
  {
    id: "vettel-ferrari-2015",
    year: 2015,
    driverCode: "VET",
    driverNumber: "5",
    driverName: "Sebastian Vettel",
    teamName: "Scuderia Ferrari",
    teamColor: "#e10600",
    headline: "Numero Uno is Back! Ferrari Wins at Sepang",
    context:
      "2015 Malaysian GP. Vettel's emotional maiden victory in just his second race with Scuderia Ferrari, ending the team's two-year win drought.",
    dialogue: [
      {
        speaker: "Maurizio Arrivabene",
        role: "team_principal",
        text: "Sebastian, P1! P1! Numero uno is back! Ferrari is back!",
      },
      {
        speaker: "Sebastian Vettel (Overcome with emotion)",
        role: "driver",
        text: "Siiii ragazzi! Mi senti?! Grazie, grazie! Forza Ferrari!",
      },
    ],
  },
  {
    id: "perez-sauber-2012",
    year: 2012,
    driverCode: "PER",
    driverNumber: "15",
    driverName: "Sergio Pérez",
    teamName: "Sauber Ferrari",
    teamColor: "#c8c8c8",
    headline: "We Need This Podium, Checo!",
    context:
      "2012 Malaysian GP in tropical deluge. Pérez hunted down Fernando Alonso for Sauber's first-ever victory before an urgent radio call from the pit wall.",
    dialogue: [
      {
        speaker: "Marco Schüpbach",
        role: "engineer",
        text: "Checo, be careful, we need this position! We need this podium, Checo!",
      },
      {
        speaker: "Sergio Pérez",
        role: "driver",
        text: "I am going for the win. I can catch him!",
      },
    ],
  },
  {
    id: "raikkonen-ice-cream-2009",
    year: 2009,
    driverCode: "RAI",
    driverNumber: "4",
    driverName: "Kimi Räikkönen",
    teamName: "Scuderia Ferrari",
    teamColor: "#e10600",
    headline: "Magnum Ice Cream During the Monsoon Red Flag",
    context:
      "2009 Malaysian GP. A tropical monsoon flooded the circuit, triggering a red flag stoppage. While other drivers sat sweating in their cockpits, Kimi changed into street clothes and grabbed an ice cream.",
    dialogue: [
      {
        speaker: "Kimi Räikkönen",
        role: "driver",
        text: "I need a dry visor, it's raining too much out here.",
      },
      {
        speaker: "Ferrari Pit Wall",
        role: "engineer",
        text: "Red flag, Kimi. Race is suspended.",
      },
    ],
  },
  {
    id: "verstappen-last-sepang-2017",
    year: 2017,
    driverCode: "VER",
    driverNumber: "33",
    driverName: "Max Verstappen",
    teamName: "Red Bull Racing",
    teamColor: "#1e41ff",
    headline: "Victory at Sepang's Final Grand Prix at Age 20",
    context:
      "October 1, 2017. One day after his 20th birthday, Max Verstappen overtook Lewis Hamilton into Turn 1 to win the 19th and final Malaysian Grand Prix.",
    dialogue: [
      {
        speaker: "Gianpiero Lambiase (GP)",
        role: "engineer",
        text: "Well done Max, that is P1! Absolutely flawless drive.",
      },
      {
        speaker: "Max Verstappen",
        role: "driver",
        text: "Haha yes boys! What a race! That's how we do it!",
      },
    ],
  },
];
