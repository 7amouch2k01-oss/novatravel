# TUNITRAVEL · NOVA

### Discover Tunisia. Your way.

TUNITRAVEL is a Tunisia-first trip-planning experience. NOVA is its AI travel companion: it helps travelers explore destinations, research options, shape day-by-day itineraries, and think through a trip budget in one conversation.

[Open the live preview](https://novatravel.lovable.app) · [Plan a trip with NOVA](https://novatravel.lovable.app/nova) · [Explore Tunisia](https://novatravel.lovable.app/explore)

## What you can do

- **Plan in conversation.** Describe the trip you have in mind and refine the route, pace, interests, dates, and traveler details as you go.
- **Explore Tunisia.** Browse destination guides and get ideas for places to visit, eat, and stay.
- **Research travel options.** NOVA can use grounded web research for destinations, hotels, flights, activities, and restaurants, with source links where available.
- **Shape an itinerary.** Build and revise a day-by-day plan, see destinations on a map, and carry trip context into the itinerary and budget views.
- **Estimate a budget.** Review a planning estimate and use the built-in currency display and conversion helper.
- **Bring a document into the conversation.** Share supported travel documents for AI-assisted analysis.

NOVA can chat in English, French, Arabic, Tunisian Derja, and Italian. The experience is designed Tunisia-first, while trip planning can cover destinations worldwide.

## What NOVA does not book

NOVA helps prepare and research trips; its search summaries are not a live quote, room or seat hold, or confirmed reservation. This project does not currently expose a supported public API or a customer-facing live hotel or airline checkout. Hotelbeds support in this repository is for operator-run evaluation sandbox work only. Sandbox activity does not create a real reservation or charge a traveler.

Treat suggested prices and budget figures as estimates unless a connected supplier confirms an exact offer and its terms. Never enter payment-card or passport details in chat.

## Run it locally

### Requirements

- [Bun](https://bun.sh/) for installing dependencies and running the project scripts
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Setup

```sh
git clone https://github.com/7amouch2k01-oss/novatravel.git
cd novatravel
bun install
cp .env.example .env
```

Add your key to `.env`:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

Then start the development server:

```sh
bun run dev
```

Open the local address printed by Vite. The Gemini key is read by server-side code; do not rename it with a `VITE_` prefix or commit your `.env` file.

## Useful commands

```sh
bun run dev       # Start the local development server
bun run build     # Create a production build
bun run preview   # Preview the production build locally
bun run lint      # Check the project with ESLint
```

## Optional Hotelbeds evaluation tools

Hotelbeds integration scripts are for a configured test account and evaluation environment. They are not used by NOVA's customer-facing search. The booking script creates and cancels a **sandbox test** booking; it must never be pointed at production credentials.

Configure the optional `HOTELBEDS_*` variables documented in `.env.example`, keep the client certificate and private key local, then use the dedicated scripts:

```sh
bun run hotelbeds:sandbox:search
bun run hotelbeds:sandbox:book-cancel
```

The CSR helper is also available as `bun run hotelbeds:csr-bridge` on a machine with the required local OpenSSL setup. Keep `.secrets/` and all credentials out of Git.

## How the app is built

- **React 19, TypeScript, and Vite** provide the application UI and build tooling.
- **TanStack Start and TanStack Router** provide server-rendered routes and server functions.
- **Gemini** powers NOVA's chat, grounded web research, and travel-planning workflows.
- **Zod** validates requests at the server boundary; provider interfaces keep research integrations modular.
- **Tailwind CSS** and reusable UI components provide the responsive interface.

AI and provider calls run on the server. Conversation and trip data are currently stored in the browser; there is no customer account or server-side booking database.

## Working with Claude Code

See [`CLAUDE.md`](./CLAUDE.md) for a portable set of instructions to give Claude Code when adapting NOVA's AI system for another project. It explains the current architecture, integration choices, security boundaries, and booking limitations.

## Project notes

This project is connected to [Lovable](https://lovable.dev). Commits pushed to the connected branch sync to the Lovable editor. Keep the branch in a working state and do not rewrite published history.
