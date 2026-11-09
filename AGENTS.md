<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Booking summaries use AI Gateway inside a server-only helper called through validated server functions; persisted booking IDs are authenticated and owner-scoped, and demo IDs resolve only server-owned facts to prevent arbitrary inference prompts.
- Studio reads owner-scoped saved requests in a session-keyed TanStack Query view and caches summaries for the session without automatic replay, so private rows never become public demo content.
- Booking requests snapshot server-resolved market or public stall facts with server-derived ownership and a unique per-owner submission key, so prices cannot be spoofed and repeated submissions do not create duplicate rows.

- Marketpartner uses owner-scoped profiles and markets, authenticated validated server functions, and publicly readable stall detail fields; participation is a business preference, not an authorization role.
- Account identity is observed once in the root session provider; public onboarding screens show inline sign-in and never call protected loaders.
