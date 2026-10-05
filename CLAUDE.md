# Claude Code guide: integrate TUNITRAVEL NOVA

Use this file as project context when adapting NOVA's AI travel-planning system for another codebase. It can be copied into that project's root as `CLAUDE.md`, or provided to Claude Code alongside a request to integrate NOVA.

## Start by choosing an integration path

1. **Link to the hosted experience** when the other product only needs to send travelers to NOVA: <https://novatravel.lovable.app/nova>.
2. **Self-host and adapt NOVA** when the other product needs its own assistant UI, data flow, or branding. Use this repository as the source of truth and adapt the server-side agent modules to the destination project's framework.
3. **Build a remote integration** only when another app must call NOVA over HTTP. This repository does not currently provide a supported public chat API. Do not guess a URL, call TanStack's generated server-function transport as a public contract, or expose an internal server function to browsers in another app. Design and document a versioned API in the hosting project first.

If the user has not chosen a path, inspect the destination project and recommend the smallest option that meets their need before making broad changes.

## NOVA architecture in this repository

- `src/lib/nova/agent.ts` contains the agent pipeline, instructions, intent routing, research orchestration, and response generation. Its main entry point is `runNovaAgent`.
- `src/lib/nova/types.ts` defines the request, response, trip context, tool, source, and result types.
- `src/lib/nova/providers.ts` defines provider contracts; `src/lib/nova/providers/travel.ts` and `src/lib/nova/providers/web-search.ts` implement Gemini-backed travel research and grounded web search.
- `src/lib/nova/grounding.ts`, `src/lib/nova/retry.ts`, and `src/lib/nova/markets.ts` handle source extraction, transient API retries, and Tunisia launch defaults.
- `src/lib/nova/server-fns.ts` wraps chat and status operations in TanStack Start server functions and validates incoming data with Zod.
- `src/hooks/use-nova-chat.ts` and `src/routes/nova.tsx` connect the browser UI to the app's server functions. The UI is not a portable API client.

The agent uses `@google/genai` and reads `GEMINI_API_KEY` from the server environment. Chat and trip state are currently kept in browser local storage; this project has no user authentication or server-side booking database.

## Safe adaptation steps

1. Inspect the destination project's framework, server runtime, routing, authentication, and existing AI conventions. Keep its established architecture unless the user requests a larger migration.
2. Port or adapt the NOVA agent and only the provider modules it needs. Resolve imports, runtime assumptions, and types for the destination instead of copying UI files or relying on this repository's `@/` alias.
3. Put the Gemini call behind a server-only route, action, or function. Keep `GEMINI_API_KEY` in server environment configuration; never prefix it with `VITE_`, bundle it into the client, or log it.
4. Validate message length, history size, attachment type and size, and trip-context fields at the server boundary. Preserve equivalent safeguards if the destination uses a validation library other than Zod.
5. Return a small, documented response shape to the client. Treat user messages, uploaded files, and search results as untrusted content; retain NOVA's grounding and source-link behavior for current travel claims.
6. Integrate incrementally into the existing chat or trip UI. Keep secrets, provider credentials, and raw supplier identifiers on the server. Add authentication, request limits, and abuse controls appropriate to the destination before exposing a remote endpoint.
7. Update that project's environment example and setup documentation with placeholder values only. Never copy local `.env`, `.secrets`, certificates, API responses containing credentials, or customer data.

## Product and booking boundaries

- NOVA can research destinations, hotels, flights, activities, and restaurants, and help prepare an itinerary. Search summaries and estimates are not confirmed availability, a quote, a reservation, or a ticket.
- This repository has no customer-facing live airline or hotel booking flow. Do not display a booking confirmation, hold, payment deadline, or supplier term unless a real provider operation returned it.
- `src/lib/nova/providers/hotelbeds-sandbox.ts` is an evaluation-environment client fixed to Hotelbeds' test host. The operator scripts in `scripts/` are not registered with NOVA's customer-facing providers. Sandbox bookings are test transactions, not real property reservations.
- Do not collect payment-card or passport details in chat. Do not promise pay-at-property or pay-after-arrival; those terms must come from the exact live supplier offer, and no such customer booking API is currently exposed here.
- Budget figures are planning estimates. Currency conversion in this project uses configured rates and is not a live exchange-rate quote.

## Verification and handoff

After implementation, summarize the files and server boundary changed, the required environment variables, the integration path chosen, and any provider limitations. Run the destination project's relevant checks when requested or required by its own instructions. Clearly distinguish working research from live supplier booking, and state any behavior that still needs real credentials or provider approval.
