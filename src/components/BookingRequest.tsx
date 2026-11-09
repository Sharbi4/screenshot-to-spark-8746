import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { usePartnerSession } from "./PartnerSession";
import { createBookingRequest } from "@/lib/bookings.functions";

export function BookingRequest({ marketId, stallId, name, unavailable = false }: { marketId?: string; stallId?: string; name: string; unavailable?: boolean }) {
  const { user, ready } = usePartnerSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const create = useServerFn(createBookingRequest);
  const queryClient = useQueryClient();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !user) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      await create({ data: { request_key: requestKey, market_id: marketId, stall_id: stallId, booking_date: String(form.get("date")), notes: String(form.get("notes") ?? "") } });
      await queryClient.invalidateQueries({ queryKey: ["booking-requests", user.id] });
      setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your request."); }
    finally { setBusy(false); }
  }
  return <>
    <Button size="lg" disabled={!ready || unavailable} onClick={() => { setRequestKey(crypto.randomUUID()); setSaved(false); setError(""); setOpen(true); }} className="h-12 rounded-full bg-honey text-honey-foreground hover:bg-honey/90"><CalendarDays />{unavailable ? "Unavailable" : "Book Space"}</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogTitle>{saved ? "Request saved" : "Request a space"}</DialogTitle>
        <DialogDescription>{name}</DialogDescription>
        {saved ? <div className="space-y-4"><p className="flex items-center gap-2 text-sage"><Check />Pending · not yet confirmed</p><Button asChild className="w-full"><Link to="/bookings">View in Studio</Link></Button></div> : !user ? <Button asChild><Link to="/auth">Sign in to request a space</Link></Button> : <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">Booking date<Input className="mt-2" name="date" type="date" required /></label>
          <label className="block text-sm font-medium">Request notes<Textarea className="mt-2" name="notes" maxLength={2000} placeholder="Optional" /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" />}{busy ? "Saving…" : "Send booking request"}</Button>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}