import { useState } from "react";

export function Gallery({ images, alt, className = "" }: { images: string[]; alt: string; className?: string }) {
  const [i, setI] = useState(0);
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          setI(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {images.map((src, k) => (
          <img key={src} src={src} alt={`${alt} ${k + 1}`} className="h-full w-full shrink-0 snap-center object-cover" />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
        {images.map((s, k) => (
          <span key={s} className={`h-1.5 rounded-full bg-on-scrim transition-all ${k === i ? "w-5" : "w-1.5 opacity-50"}`} />
        ))}
      </div>
    </div>
  );
}
