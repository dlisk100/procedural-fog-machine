<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

`procedural-fog-machine`

We are building a hackathon app called **The Procedural Fog Machine**.

The app is a funny web tool where a user pastes a scary landlord, legal,
compliance, or admin message, chooses a domain, stance, and Slop Density, then
presses **FIRE THE FOG MACHINE**. The app streams humorous shell-firing progress
updates while generating an absurdly verbose, polite, non-admitting
bureaucratic response packet.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Vercel deployment
- OpenRouter API via server route
- No auth
- No database
- HTML preview plus browser print/export

## Coding Instructions

- Keep the app simple and hackathon-focused.
- Prefer readable TypeScript over clever abstractions.
- Do not add unnecessary dependencies.
- Do not add auth, database, payment, or external PDF services.
- Use `app/api/cannon/route.ts` for the backend.
- Use NDJSON streaming events from backend to frontend.
- Use Tailwind for styling.
- Keep the UI funny and theatrical.

## Safety and Content Constraints

- Do not invent laws or legal citations.
- Do not claim to be a lawyer.
- Do not threaten anyone.
- Do not advise ignoring real deadlines.
- Do not impersonate an attorney.
- Do not fabricate facts.
- Use polite, absurdly bureaucratic, non-admission language.
- Include this visible disclaimer: "Comedy-powered drafting support. Not legal advice."

## Definition of Done

- `npm run lint` passes.
- `npm run dev` runs locally.
- The UI has a left input panel and right live output panel.
- The app can call `/api/cannon` and stream events.
