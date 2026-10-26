import { Zap, Droplets, LayoutGrid, Sun, Wifi, Car } from "lucide-react";
import type { Amenity } from "@/lib/markets";

const map = {
  power: { icon: Zap, label: "Power" },
  water: { icon: Droplets, label: "Water" },
  corner: { icon: LayoutGrid, label: "Corner space" },
  shade: { icon: Sun, label: "Shade" },
  wifi: { icon: Wifi, label: "Wi‑Fi" },
  parking: { icon: Car, label: "Vendor parking" },
} as const;

export function Amenities({ items }: { items: Amenity[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((a) => {
        const { icon: Icon, label } = map[a];
        return (
          <div key={a} className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3.5">
            <Icon className="h-[18px] w-[18px] text-sage" strokeWidth={2} />
            <span className="text-sm font-medium">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
