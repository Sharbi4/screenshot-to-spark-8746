import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";

/** Native share sheet on mobile; copies the link elsewhere. */
export function ShareButton({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) return await navigator.share({ title, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user dismissed */
    }
  }
  return (
    <button type="button" onClick={() => void share()} className={className} aria-label={copied ? "Link copied" : "Share"}>
      {copied ? <Check className="h-5 w-5" /> : children}
    </button>
  );
}
