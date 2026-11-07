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

- Booking summaries use AI Gateway inside a server-only helper called through a validated server function; only server-owned public demo booking IDs are accepted to prevent arbitrary inference prompts.
- Studio caches summaries in TanStack Query for the current session and disables automatic replay; booking persistence and private-user authorization remain separate work.

- Marketpartner uses owner-scoped profiles and markets, authenticated validated server functions, and publicly readable stall detail fields; participation is a business preference, not an authorization role.
- Account identity is observed once in the root session provider; public onboarding screens show inline sign-in and never call protected loaders.
