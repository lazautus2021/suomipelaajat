// lib/broadcasters.ts
// Päivitä manuaalisesti kun lähetystieto muuttuu.
// Avaimet = kilpailun nimi TÄSMÄLLEEN kuten tietokannassa.

export interface Broadcaster {
  name: string;
  url?: string;
}

const BROADCASTERS: Record<string, Broadcaster[]> = {

  // ── Espanja ────────────────────────────────────────────────────────────────
  'La Liga':                              [{ name: 'MTV Katsomo', url: 'https://www.katsomo.fi' }],
  'Copa del Rey':                         [{ name: 'MTV Katsomo', url: 'https://www.katsomo.fi' }],

  // ── Englanti ───────────────────────────────────────────────────────────────
  'FA Cup':                               [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'League Cup':                           [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'League One':                           [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'EFL Trophy':                           [],  // Ei Suomessa

  // ── Skotlanti ──────────────────────────────────────────────────────────────
  'Premiership':                          [{ name: 'V Sport', url: 'https://viaplay.fi' }],

  // ── Italia ─────────────────────────────────────────────────────────────────
  'Coppa Italia':                         [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'Serie B':                              [],  // Tarkista — ei varmuutta

  // ── Saksa ──────────────────────────────────────────────────────────────────
  '2. Bundesliga':                        [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'DFB Pokal':                            [{ name: 'V Sport', url: 'https://viaplay.fi' }],

  // ── Ranska ─────────────────────────────────────────────────────────────────
  'Ligue 1':                              [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'Coupe de France':                      [{ name: 'V Sport', url: 'https://viaplay.fi' }],

  // ── Alankomaat ─────────────────────────────────────────────────────────────
  'Eredivisie':                           [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'Eerste Divisie':                       [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'KNVB Beker':                           [{ name: 'V Sport', url: 'https://viaplay.fi' }],

  // ── Ruotsi ─────────────────────────────────────────────────────────────────
  'Allsvenskan':                          [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'Superettan':                           [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'Svenska Cupen':                        [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'Damallsvenskan':                       [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'Svenska Cupen - Women':               [{ name: 'V Sport', url: 'https://viaplay.fi' }],

  // ── Norja ──────────────────────────────────────────────────────────────────
  'Eliteserien':                          [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'NM Cupen':                             [{ name: 'V Sport', url: 'https://viaplay.fi' }],

  // ── Tanska ─────────────────────────────────────────────────────────────────
  'Superliga':                            [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'DBU Pokalen':                          [],  // Ei varmuutta

  // ── Uusi-Seelanti / Muut ───────────────────────────────────────────────────
  'Chatham Cup':                          [],  // Ei Suomessa
  'The Atlantic Cup':                     [],  // Harjoitusturnaus

  // ── Harjoitusottelut ───────────────────────────────────────────────────────
  'Friendlies':                           [{ name: 'Yle Areena', url: 'https://areena.yle.fi' }],
  'Friendlies Women':                     [{ name: 'Yle Areena', url: 'https://areena.yle.fi' }],
  'Friendlies Clubs':                     [],

  // ── UEFA ───────────────────────────────────────────────────────────────────
  'UEFA Champions League':               [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'UEFA Europa League':                  [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'UEFA Europa Conference League':       [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'UEFA Champions League Women':         [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'UEFA Europa Cup - Women':             [{ name: 'V Sport', url: 'https://viaplay.fi' }],
  'UEFA Championship - Women':           [{ name: 'Yle Areena', url: 'https://areena.yle.fi' }],
  'UEFA Championship - Women - Qualification': [{ name: 'Yle Areena', url: 'https://areena.yle.fi' }],
  'UEFA Nations League - Women':         [{ name: 'Yle Areena', url: 'https://areena.yle.fi' }],
  'UEFA U21 Championship':               [{ name: 'Yle Areena', url: 'https://areena.yle.fi' }],
  'UEFA U21 Championship - Qualification': [{ name: 'Yle Areena', url: 'https://areena.yle.fi' }],

};

export function getBroadcasters(competition: string): Broadcaster[] {
  return BROADCASTERS[competition] ?? [];
}
