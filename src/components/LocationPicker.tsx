import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMapConfig } from "@/lib/map.functions";
import { AnimatePresence, motion } from "framer-motion";
import { Globe2, LoaderCircle, LocateFixed, MapPin, Search, X } from "lucide-react";

export type Place = { label: string; latitude: number; longitude: number } | null; // null = nationwide

const KEY = "vb-place";

// The public Mapbox token comes from the server at runtime (Lovable secret), never from Git.
async function geocode(token: string, params: Record<string, string>, path: "forward" | "reverse") {
  if (!token) return [];
  const u = new URL(`https://api.mapbox.com/search/geocode/v6/${path}`);
  u.search = new URLSearchParams({ ...params, country: "us", types: "place,postcode,locality", access_token: token }).toString();
  const res = await fetch(u);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.features ?? []).map((f: { properties: { name: string; place_formatted?: string; full_address?: string }; geometry: { coordinates: [number, number] } }) => {
    const region = f.properties.place_formatted?.split(",")[0];
    return { label: region ? `${f.properties.name}, ${region}` : f.properties.name, longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1] };
  }) as NonNullable<Place>[];
}

export function useSavedPlace() {
  const [place, setPlace] = useState<Place>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v) setPlace(JSON.parse(v));
    } catch { /* ignore */ }
  }, []);
  const save = (p: Place) => {
    setPlace(p);
    try { p ? localStorage.setItem(KEY, JSON.stringify(p)) : localStorage.removeItem(KEY); } catch { /* ignore */ }
  };
  return [place, save] as const;
}

export function LocationPicker({ place, onChange }: { place: Place; onChange: (p: Place) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<NonNullable<Place>[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const loadConfig = useServerFn(getMapConfig);
  const token = useQuery({ queryKey: ["map-config"], queryFn: () => loadConfig(), staleTime: Infinity }).data?.token ?? "";

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => {
      geocode(token, { q: q.trim(), limit: "6", autocomplete: "true" }, "forward").then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, token]);

  function pick(p: Place) {
    onChange(p);
    setOpen(false);
    setQ("");
    setNotice("");
  }

  function locate() {
    if (!("geolocation" in navigator)) return setNotice("Location isn't available on this device.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const [hit] = await geocode(token, { latitude: String(latitude), longitude: String(longitude), limit: "1" }, "reverse").catch(() => []);
        setBusy(false);
        pick({ label: hit?.label ?? "Near you", latitude, longitude });
      },
      () => { setBusy(false); setNotice("Location permission was declined. Search for a city instead."); },
      { timeout: 10000 },
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="tap glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground" aria-label="Change location">
        {place ? <MapPin className="h-3.5 w-3.5" /> : <Globe2 className="h-3.5 w-3.5" />} {place?.label ?? "All of USA"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass fixed inset-0 z-50 overflow-y-auto">
            <div className="mx-auto max-w-xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-3 rounded-full bg-card px-5 py-4 shadow-soft">
                  <Search className="h-5 w-5" />
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="City or ZIP code" className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
                </div>
                <button onClick={() => setOpen(false)} className="tap rounded-full bg-card p-3.5 shadow-soft" aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-6 space-y-2 text-foreground">
                <button onClick={locate} className="tap flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft">
                  {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
                  <span className="font-semibold">Use my current location</span>
                </button>
                <button onClick={() => pick(null)} className="tap flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft">
                  <Globe2 className="h-5 w-5" /><span className="font-semibold">All of USA</span>
                </button>
                {notice && <p role="status" className="px-1 text-sm text-muted-foreground">{notice}</p>}
                {!token && <p className="px-1 text-sm text-muted-foreground">City search is unavailable right now.</p>}
                {results.map((r) => (
                  <button key={`${r.label}${r.latitude}`} onClick={() => pick(r)} className="tap flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-soft">
                    <MapPin className="h-5 w-5" /><span className="font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
