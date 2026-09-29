import tunis from "@/assets/tunis.jpg";
import carthage from "@/assets/carthage.jpg";
import sidi from "@/assets/sidi-bou-said.jpg";
import hammamet from "@/assets/hammamet.jpg";
import djerba from "@/assets/djerba.jpg";
import tozeur from "@/assets/tozeur.jpg";
import eljem from "@/assets/el-jem.jpg";
import sahara from "@/assets/sahara.jpg";

export type Destination = {
  slug: string;
  name: string;
  category: string;
  tags: string[];
  blurb: string;
  why: string;
  bestFor: string[];
  region: string;
  duration: string;
  nearby: string[];
  match: number;
  image: string;
  // position on stylised map (0-100)
  x: number;
  y: number;
  // Real geographic coordinates
  lat: number;
  lng: number;
};

export const destinations: Destination[] = [
  { slug: "tunis", name: "Tunis", category: "Culture", tags: ["Culture", "Food", "History"], blurb: "A living medina of souks, lanterns and centuries-old mosques.", why: "The medina's craft streets and food scene suit your love of culture at a relaxed pace.", bestFor: ["Culture", "Food", "Shopping", "History"], region: "North · Capital", duration: "Half day – 1 day", nearby: ["carthage", "sidi-bou-said"], match: 92, image: tunis, x: 52, y: 14, lat: 36.8065, lng: 10.1815 },
  { slug: "carthage", name: "Carthage", category: "History", tags: ["History", "Culture"], blurb: "Phoenician and Roman ruins overlooking the Gulf of Tunis.", why: "Seaside ruins combine history with sweeping Mediterranean views — ideal for a couple.", bestFor: ["History", "Photography", "Couples"], region: "North · Gulf of Tunis", duration: "3 – 4 hours", nearby: ["sidi-bou-said", "tunis"], match: 89, image: carthage, x: 57, y: 11, lat: 36.8528, lng: 10.3233 },
  { slug: "sidi-bou-said", name: "Sidi Bou Said", category: "Romantic", tags: ["Romantic", "Culture"], blurb: "Perfect for architecture, sea views and relaxed afternoons.", why: "Beautiful blue-and-white architecture, Mediterranean views and a relaxed atmosphere make this a strong match for your preferences.", bestFor: ["Culture", "Photography", "Couples", "Relaxation"], region: "North · 20 km from Tunis", duration: "Half day", nearby: ["carthage", "tunis"], match: 97, image: sidi, x: 60, y: 9, lat: 36.8698, lng: 10.3414 },
  { slug: "hammamet", name: "Hammamet", category: "Beach", tags: ["Beach", "Romantic", "Family"], blurb: "A walled medina meeting soft sand and calm, clear water.", why: "Calm beaches and an intimate medina balance your beach time with culture.", bestFor: ["Beaches", "Relaxation", "Couples"], region: "Cap Bon · Coast", duration: "1 – 2 days", nearby: ["sidi-bou-said", "el-jem"], match: 94, image: hammamet, x: 60, y: 24, lat: 36.4000, lng: 10.6167 },
  { slug: "el-jem", name: "El Jem", category: "History", tags: ["History", "Culture"], blurb: "One of the largest Roman amphitheatres in the world.", why: "An unmissable day-trip on the coastal route, fitting your culture interest.", bestFor: ["History", "Architecture", "Photography"], region: "Sahel · Inland", duration: "2 – 3 hours", nearby: ["hammamet"], match: 86, image: eljem, x: 62, y: 42, lat: 35.3000, lng: 10.7167 },
  { slug: "djerba", name: "Djerba", category: "Beach", tags: ["Beach", "Family", "Food"], blurb: "Turquoise shallows, whitewashed villages and island calm.", why: "Excellent for slow beach days — best with a longer trip or a domestic flight.", bestFor: ["Beaches", "Family", "Relaxation"], region: "South · Island", duration: "2 – 3 days", nearby: ["sahara"], match: 81, image: djerba, x: 70, y: 66, lat: 33.8075, lng: 10.8451 },
  { slug: "tozeur", name: "Tozeur", category: "Nature", tags: ["Nature", "Adventure"], blurb: "A palm oasis with patterned brick architecture on the desert's edge.", why: "A striking contrast to the coast if you'd like to add an adventurous chapter.", bestFor: ["Nature", "Architecture", "Adventure"], region: "South-west · Oasis", duration: "1 – 2 days", nearby: ["sahara"], match: 78, image: tozeur, x: 30, y: 60, lat: 33.9197, lng: 8.1335 },
  { slug: "sahara", name: "Sahara", category: "Adventure", tags: ["Adventure", "Nature", "Romantic"], blurb: "Golden dunes, camel treks and nights under endless stars.", why: "A memorable desert night — best on trips of 7 days or more.", bestFor: ["Adventure", "Stargazing", "Couples"], region: "South · Douz", duration: "1 – 2 nights", nearby: ["tozeur", "djerba"], match: 83, image: sahara, x: 42, y: 74, lat: 33.4663, lng: 9.0203 },
];

export const bySlug = (s: string) => destinations.find((d) => d.slug === s);

export const filters = ["Culture", "Beach", "Nature", "Adventure", "Romantic", "Family", "Food", "History"];

export const tripStops = ["carthage", "sidi-bou-said", "hammamet", "el-jem"];

export const budget = [
  { label: "Accommodation", value: 1050 },
  { label: "Transport", value: 420 },
  { label: "Activities", value: 380 },
  { label: "Food", value: 600 },
];
export const budgetTotal = budget.reduce((a, b) => a + b.value, 0);

export type Activity = { time: string; slot: string; place: string; slug: string; duration: string; desc: string; next?: string };
export const itinerary: { day: number; city: string; theme: string; items: Activity[] }[] = [
  { day: 1, city: "Tunis", theme: "Medina, ruins & a blue-white sunset", items: [
    { time: "09:30", slot: "Morning", place: "Medina of Tunis", slug: "tunis", duration: "2h 30m", desc: "Wander the souks and Zitouna Mosque surroundings with a local mint tea stop.", next: "25 min drive" },
    { time: "14:00", slot: "Afternoon", place: "Carthage", slug: "carthage", duration: "3h", desc: "Antonine Baths and Byrsa Hill, timed for softer afternoon light.", next: "10 min drive" },
    { time: "18:00", slot: "Evening", place: "Sidi Bou Said", slug: "sidi-bou-said", duration: "2h 30m", desc: "Café des Délices at sunset, then dinner overlooking the marina." },
  ]},
  { day: 2, city: "Hammamet", theme: "Slow coastal day", items: [
    { time: "10:00", slot: "Morning", place: "Hammamet beach", slug: "hammamet", duration: "3h", desc: "Arrive and settle in; calm water perfect for a relaxed swim.", next: "5 min walk" },
    { time: "16:00", slot: "Afternoon", place: "Hammamet Medina", slug: "hammamet", duration: "2h", desc: "Walk the kasbah walls and small artisan shops by the sea." },
  ]},
  { day: 3, city: "El Jem", theme: "Roman grandeur", items: [
    { time: "09:00", slot: "Morning", place: "El Jem Amphitheatre", slug: "el-jem", duration: "2h 30m", desc: "Explore the arena and underground passages before midday heat.", next: "1h 45m drive" },
    { time: "15:00", slot: "Afternoon", place: "Back to Hammamet", slug: "hammamet", duration: "Free time", desc: "Hammam and spa afternoon — keeping the pace relaxed." },
  ]},
];

export const novaReplies: Record<string, string> = {
  "Make it more relaxing": "Done. I've moved El Jem to a half-day and added a free beach afternoon on Day 4. Your walking time drops by about 35%.",
  "Reduce the budget": "I can bring the estimate to ~2,100 TND by swapping to a boutique guesthouse in Hammamet and using louage for the El Jem leg.",
  "Add more beaches": "I'd add Nabeul's quieter beaches on Day 4 — 20 minutes from Hammamet, so the route stays efficient.",
  "Add cultural experiences": "I've added a Tunisian cooking class in the medina and a visit to the Bardo Museum on Day 1 morning.",
  "Show alternatives": "Two alternatives: swap Hammamet for Monastir (quieter, historic ribat) or replace El Jem with Kairouan's Great Mosque.",
  "Build itinerary": "Your 5-day itinerary is ready: Tunis → Carthage → Sidi Bou Said → Hammamet → El Jem. Open it in My Trip to see each day.",
  "Find destinations": "Based on culture + beaches + beauty, your top matches are Sidi Bou Said (97%), Hammamet (94%) and Tunis (92%).",
  "Optimize route": "I've ordered stops north to south to avoid backtracking. Total driving: about 5h 10m across the trip.",
  "Check budget": "Current estimate is ~2,450 TND for two — just under your 2,500 TND target. Accommodation is the largest share.",
};
