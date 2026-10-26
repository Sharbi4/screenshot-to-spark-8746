export type Amenity = "power" | "water" | "corner" | "shade" | "wifi" | "parking";

export interface Market {
  id: string;
  name: string;
  city: string;
  kind: "night" | "farmers" | "artisan";
  day: string;
  hours: string;
  price: number;
  rating: number;
  reviews: number;
  stallsLeft: number;
  footfall: string;
  description: string;
  amenities: Amenity[];
  images: string[];
  pos: { x: number; y: number };
}

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const markets: Market[] = [
  {
    id: "lantern-row",
    name: "Lantern Row Night Market",
    city: "Phoenix, AZ",
    kind: "night",
    day: "Fri & Sat",
    hours: "6 PM – 12 AM",
    price: 85,
    rating: 4.9,
    reviews: 412,
    stallsLeft: 6,
    footfall: "9.2k",
    description:
      "Two blocks of string lights, street food, and live sets under the Roosevelt Row murals. Our busiest stalls sell out by 9 PM.",
    amenities: ["power", "water", "corner", "wifi"],
    images: [u("photo-1555939594-58d7cb561ad1"), u("photo-1504674900247-0877df9cc836"), u("photo-1533777857889-4be7c70b33f7")],
    pos: { x: 42, y: 38 },
  },
  {
    id: "old-town-farmers",
    name: "Old Town Farmers Market",
    city: "Scottsdale, AZ",
    kind: "farmers",
    day: "Saturdays",
    hours: "8 AM – 1 PM",
    price: 45,
    rating: 4.8,
    reviews: 298,
    stallsLeft: 11,
    footfall: "5.4k",
    description:
      "Shaded brick plaza, early-rising regulars, and a strong produce-first crowd. Ideal for growers, bakers, and cold brew.",
    amenities: ["shade", "water", "parking"],
    images: [u("photo-1488459716781-31db52582fe9"), u("photo-1542838132-92c53300491e"), u("photo-1610832958506-aa56368176cf")],
    pos: { x: 66, y: 28 },
  },
  {
    id: "neon-alley",
    name: "Neon Alley Eats",
    city: "Tempe, AZ",
    kind: "night",
    day: "Thursdays",
    hours: "7 PM – 11 PM",
    price: 60,
    rating: 4.7,
    reviews: 186,
    stallsLeft: 3,
    footfall: "6.1k",
    description:
      "A student-heavy crowd beside Mill Avenue. Loud, bright, and hungry — dumplings and bubble tea do especially well.",
    amenities: ["power", "corner", "wifi"],
    images: [u("photo-1514933651103-005eec06c04b"), u("photo-1529543544282-ea669407fca3"), u("photo-1565299624946-b28f40a0ae38")],
    pos: { x: 58, y: 58 },
  },
  {
    id: "desert-bloom",
    name: "Desert Bloom Growers",
    city: "Mesa, AZ",
    kind: "farmers",
    day: "Sundays",
    hours: "9 AM – 2 PM",
    price: 38,
    rating: 4.9,
    reviews: 154,
    stallsLeft: 14,
    footfall: "3.8k",
    description:
      "Family-friendly lawn market with a dedicated organic row, kids' corner, and the best citrus in the valley.",
    amenities: ["shade", "water", "parking", "power"],
    images: [u("photo-1506484381205-f7945653044d"), u("photo-1471193945509-9ad0617afabf"), u("photo-1464226184884-fa280b87c399")],
    pos: { x: 80, y: 50 },
  },
  {
    id: "canal-makers",
    name: "Canal Makers Fair",
    city: "Phoenix, AZ",
    kind: "artisan",
    day: "1st Friday",
    hours: "5 PM – 10 PM",
    price: 70,
    rating: 4.8,
    reviews: 231,
    stallsLeft: 8,
    footfall: "7.0k",
    description:
      "Ceramics, prints, vintage, and small-batch goods along the Arizona Canal. A design-literate crowd that buys.",
    amenities: ["power", "corner", "shade"],
    images: [u("photo-1513519245088-0e12902e5a38"), u("photo-1452860606245-08befc0ff44b"), u("photo-1531058020387-3be344556be6")],
    pos: { x: 28, y: 22 },
  },
  {
    id: "sonoran-twilight",
    name: "Sonoran Twilight Bazaar",
    city: "Chandler, AZ",
    kind: "night",
    day: "Saturdays",
    hours: "6 PM – 11 PM",
    price: 55,
    rating: 4.6,
    reviews: 97,
    stallsLeft: 9,
    footfall: "4.6k",
    description:
      "A newer market with generous 12×12 stalls, good lighting, and a growing weekly crowd near downtown Chandler.",
    amenities: ["power", "water", "parking"],
    images: [u("photo-1519671482749-fd09be7ccebf"), u("photo-1496412705862-e0088f16f791"), u("photo-1504754524776-8f4f37790ca0")],
    pos: { x: 54, y: 78 },
  },
  {
    id: "roots-rows",
    name: "Roots & Rows Market",
    city: "Gilbert, AZ",
    kind: "farmers",
    day: "Saturdays",
    hours: "7 AM – 12 PM",
    price: 42,
    rating: 4.7,
    reviews: 143,
    stallsLeft: 5,
    footfall: "4.1k",
    description:
      "Heritage-farm grounds with a loyal, high-spending crowd. Honey, eggs, and flowers sell out fast.",
    amenities: ["shade", "water", "parking"],
    images: [u("photo-1550989460-0adf9ea622e2"), u("photo-1573246123716-6b1782bfc499"), u("photo-1595855759920-86582396756a")],
    pos: { x: 74, y: 70 },
  },
];

export const getMarket = (id: string) => markets.find((m) => m.id === id);

export const rails = [
  { title: "Trending Night Markets", items: markets.filter((m) => m.kind === "night") },
  { title: "Organic Farmer's Markets", items: markets.filter((m) => m.kind === "farmers") },
  { title: "Makers & Artisans", items: markets.filter((m) => m.kind !== "farmers").reverse() },
];

export const heroImage = u("photo-1533777857889-4be7c70b33f7", 1800);

export const bookings = [
  { marketId: "lantern-row", date: "Fri, Oct 30", stall: "B-14 · Corner", status: "Confirmed" },
  { marketId: "old-town-farmers", date: "Sat, Oct 31", stall: "A-03", status: "Confirmed" },
  { marketId: "neon-alley", date: "Thu, Nov 5", stall: "C-08", status: "Pending" },
];
