# Suomipelaajat – projektimuistiinpanot

## Stack
- **Next.js 16** (App Router) – huom. `middleware.ts` → `proxy.ts`, funktio `proxy` eikä `middleware`
- **Neon** (serverless Postgres) – yhteys `@neondatabase/serverless`
- **Vercel** – deployment, automaattinen kun pushataan GitHubiin
- **Tailwind v4** – `@import "tailwindcss"` globals.css:ssä, ei utility-luokkia komponenteissa
- **football-api-sports.io v3** – otteludatan lähde

## Ympäristömuuttujat
Lokaalisti: `.env.local` (piilotettu tiedosto, Cmd+Shift+. Finderissa)
Vercelissä: Settings → Environment Variables

| Muuttuja | Mistä löytyy |
|----------|-------------|
| `DATABASE_URL` | Neon dashboard → Connection string |
| `ADMIN_PASSWORD` | Itse keksitty, sama molemmissa |
| `APIFOOTBALL_KEY` | 425b38292167d0a0f2a3fe691abe30a0 (on myös koodissa fallbackina) |

## Tietokanta (Neon)
- Projekti: `neondb`, region: eu-central-1
- Taulut: `players`, `fixtures`, `fixture_players`, `broadcasters`
- Ottelut haetaan APIsta: `npx tsx lib/fetch-fixtures.ts`
- Pelaajat päivitetään manuaalisesti admin-paneelista tai suoraan Neonista

## GitHub
- Repo: https://github.com/lazautus2021/suomipelaajat
- Remote: HTTPS (ei SSH) – token tallennettuna git credentialsiin

## Admin-paneeli
- URL: `/admin` (tuotannossa Vercel-domain + /admin)
- Kirjautuminen: `ADMIN_PASSWORD` ympäristömuuttujalla
- Pelaajien ja broadcastereiden hallinta

## Tärkeä koodikäytäntö
`neon()` ei saa olla moduulitasolla – kutsutaan aina handler-funktion sisällä:
```ts
// ÄLÄ näin (moduulitaso):
const sql = neon(process.env.DATABASE_URL!)

// Näin (funktion sisällä):
export async function GET() {
  const sql = getDb()
  ...
}
```

## Ominaisuudet
- Matsilistauk kilpailukohtaisilla filtereillä
- Live-pisteet (pollaus 20s välein)
- Maalinotifikaatiot äänellä (Web Audio API) + selaimen push-notifikaatiot
- Matsikortista "Lisätietoa" → modal jossa kokoonpano + suomalaiset korostettuna
- Broadcasterit per kilpailu (esim. La Liga → MTV Katsomo)
