import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBookingSummary } from "@/lib/booking-summary.functions";

export function BookingSummary({ marketId }: { marketId: string }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const summarize = useServerFn(getBookingSummary);
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["booking-summary", marketId],
    queryFn: () => summarize({ data: { marketId } }),
    enabled: hydrated,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="mt-3 flex items-start gap-2 border-t pt-3 text-sm" aria-live="polite" aria-busy={isFetching}>
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-sage">AI summary</p>
        {isFetching || !hydrated ? (
          <p className="mt-1 flex items-center gap-2 text-muted-foreground"><LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />Summarizing booking…</p>
        ) : data?.summary ? (
          <p className="mt-1 break-words leading-relaxed text-muted-foreground">{data.summary}</p>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground">{isError ? "Summary unavailable. Your booking details are unchanged." : data?.error}</p>
            <Button variant="ghost" size="sm" onClick={() => void refetch()}><RotateCcw />Try again</Button>
          </div>
        )}
      </div>
    </div>
  );
}