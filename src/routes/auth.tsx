import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { usePartnerSession } from "@/components/PartnerSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Page } from "@/components/PageTransition";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({ head: () => ({ meta: [
  { title: "Marketpartner sign in — Vendibook" }, { name: "description", content: "Sign in or create your Marketpartner account." },
  { property: "og:title", content: "Marketpartner sign in — Vendibook" }, { property: "og:description", content: "Join Vendibook as a vendor or market organizer." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: Auth });

function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = usePartnerSession();
  const navigate = useNavigate();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")); const password = String(form.get("password") ?? "");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error; setMessage("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/partner` } });
        if (error) throw error;
        if (data.session) await navigate({ to: "/partner" }); else setMessage("Check your email to confirm your account, then sign in to complete onboarding.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error; await navigate({ to: "/partner" });
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not sign in."); }
    finally { setBusy(false); }
  }
  async function social(provider: "google" | "lovable") {
    setBusy(true); setMessage("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/partner` });
      if (result.error) throw result.error;
      if (!result.redirected) await navigate({ to: "/partner" });
    } catch { setMessage("Sign-in could not be completed. Please try again."); }
    finally { setBusy(false); }
  }
  return <Page className="mx-auto max-w-md px-5 pb-32 pt-12">
    <p className="eyebrow text-sage">Vendibook</p><h1 className="display mt-3 text-5xl">Marketpartner</h1>
    {user ? <div className="mt-8"><p className="text-muted-foreground">You’re signed in.</p><Button asChild className="mt-4"><Link to="/partner">Continue to your account</Link></Button></div> : <>
      <h2 className="mt-8 text-2xl font-semibold">{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Welcome back"}</h2>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-medium">Email<Input name="email" type="email" autoComplete="email" required className="mt-2" /></label>
        {mode !== "reset" && <label className="block text-sm font-medium">Password<Input name="password" type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required className="mt-2" /></label>}
        <Button disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</Button>
      </form>
      {mode !== "reset" && <div className="mt-5 grid gap-3">
        <Button variant="outline" disabled={busy} onClick={() => void social("google")}><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 2.6-4.96 6.73-4.96z"/></svg>Continue with Google</Button>
        <Button className="lovable-auth-button" disabled={busy} onClick={() => void social("lovable")}>Continue with Lovable</Button>
      </div>}
      <div className="mt-4 flex flex-wrap gap-2"><Button variant="link" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(""); }}>{mode === "signup" ? "Already have an account?" : "Create an account"}</Button><Button variant="link" onClick={() => setMode(mode === "reset" ? "signin" : "reset")}>{mode === "reset" ? "Back to sign in" : "Forgot password?"}</Button></div>
    </>}
    {message && <p role="status" className="mt-4 text-sm text-muted-foreground">{message}</p>}
  </Page>;
}