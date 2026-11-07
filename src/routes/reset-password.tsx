import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: [
  { title: "Reset your password — Vendibook" }, { name: "description", content: "Set a new password for your Marketpartner account." }, { property: "og:title", content: "Reset your password — Vendibook" }, { property: "og:description", content: "Recover access to your Marketpartner account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Reset });
function Reset() {
  const [valid, setValid] = useState(false); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { setValid(window.location.hash.includes("type=recovery")); }, []);
  return <main className="mx-auto max-w-md px-5 pt-12 pb-32"><h1 className="display text-4xl">New password</h1>{valid ? <form className="mt-6 space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); const password = String(new FormData(event.currentTarget).get("password"));
    const { error } = await supabase.auth.updateUser({ password }); setMessage(error ? error.message : "Password updated."); setBusy(false);
  }}><label className="block">New password<Input name="password" type="password" minLength={8} autoComplete="new-password" required /></label><Button disabled={busy}>Save password</Button></form> : <p className="mt-6">Open the password reset link from your email.</p>}<p role="status" className="mt-4">{message}</p><Button asChild variant="link"><Link to="/auth">Back to sign in</Link></Button></main>;
}