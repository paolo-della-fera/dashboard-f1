# Piano di sviluppo – Dashboard F1

Una fase per sessione. Dopo ogni fase: verifica manuale → test e lint → commit → aggiorna lo stato qui sotto.

## Stato
- [x] Fase 0 – Setup del progetto
- [x] Fase 1 – Livello dati (client API)
- [x] Fase 2 – Calendario
- [ ] Fase 3 – Classifiche
- [ ] Fase 4 – Risultati
- [ ] Fase 5 – Testa a testa: dati e statistiche
- [ ] Fase 6 – Testa a testa: interfaccia e grafici
- [ ] Fase 7 – Rifinitura e pubblicazione

---

## Fase 0 – Setup del progetto
- Progetto Vite + React + TypeScript (strict)
- Installare: Tailwind, React Router, TanStack Query, Recharts, Vitest, Testing Library, ESLint
- Creare la struttura cartelle descritta in CLAUDE.md
- Layout base: barra di navigazione con le 4 sezioni, pagine vuote con titolo
- Script npm: dev, test, lint, build

**Fatto quando:** `npm run dev` mostra la navigazione funzionante tra 4 pagine vuote; `npm test` e `npm run lint` passano.

## Fase 1 – Livello dati (client API)
La fase più importante: tutto il resto si appoggia qui.
- Tipi TypeScript per: Race, Driver, Constructor, Result, QualifyingResult, DriverStanding, ConstructorStanding
- Client in `src/api/` con:
  - coda che rispetta il limite di 4 richieste/secondo
  - funzione che scarica automaticamente tutte le pagine (limit=100 + offset finché si raggiunge `total`)
  - cache persistente: permanente per stagioni concluse, poche ore per quella corrente
  - gestione errori (incluso HTTP 429 con nuovo tentativo dopo attesa)
- Funzioni: getSchedule(season), getDriverStandings(season), getConstructorStandings(season), getRaceResults(season, round), getQualifying(season, round), getSprint(season, round), getSeasonResults(season), getAllDrivers(), getDriverResults(driverId), getDriverQualifying(driverId), getDriverSeasonStandings(driverId)
- Test con fetch simulato: paginazione, cache, coda, errori

**Fatto quando:** tutti i test passano e una pagina di prova mostra a schermo i dati grezzi della stagione corrente.

**Come funziona (riepilogo):**
- *Coda* (`src/api/rateLimiter.ts`): ogni richiesta prende il suo turno, al massimo 4 al secondo. Se il limite di 500/ora imporrebbe un'attesa oltre 10 s, la richiesta fallisce subito con `ApiError` (`rateLimited: true`, `retryAfterMs`); `isRateLimitError()` permette alle pagine di mostrare "riprova tra X minuti".
- *Errori* (`src/api/client.ts`): 429, 5xx ed errori di rete vengono ritentati fino a 3 volte (1 s, 2 s, 4 s oppure il `Retry-After` del server, se ≤10 s); gli altri errori (es. 404) falliscono subito.
- *Pagine*: prima pagina con `limit=100`, poi tutte le altre fino a `total`; le gare spezzate tra due pagine vengono riunite (`src/api/paginate.ts`).
- *Cache* (`src/api/cache.ts`, IndexedDB con ripiego in memoria): stagioni concluse senza scadenza; stagione in corso 6 h, ma 30 min se la risposta è vuota; dati per pilota 24 h. Chiavi con prefisso `v1:`.
- *Funzioni pubbliche*: `src/api/index.ts`. Pagina di prova nascosta: `/dev/dati`.
- Nota: Jolpica non accetta `drivers/{id}/driverStandings/` senza stagione, quindi `getDriverSeasonStandings` legge prima `drivers/{id}/seasons/` e poi una classifica per stagione (in cache per sempre per le stagioni concluse).

## Fase 2 – Calendario
- Elenco gare della stagione: round, nome GP, circuito, paese, data
- Gare passate distinte da quelle future; link ai risultati per quelle concluse
- Card "Prossima gara" con countdown
- Selettore di stagione

**Fatto quando:** il calendario è corretto per la stagione corrente e per una stagione storica (es. 1988).

**Come funziona (riepilogo):**
- *Logica* (`src/lib/calendar.ts`): inizio gara = `date` + `time` UTC (mezzanotte UTC se manca l'orario); una gara è "in corso" per 3 h dall'inizio, poi "passata". Prossima gara = prima non passata. Stagioni selezionabili 1950 → anno corrente, generate senza chiamate API.
- *Pagina*: stagione nel parametro `?stagione=AAAA` (default anno corrente). Link "Risultati" sulle gare passate verso `/risultati/:season/:round` (rotta già registrata, pagina vuota fino alla Fase 4).
- *staleTime TanStack Query* (`src/hooks/queryClient.ts`): la cache del client (IndexedDB) decide la freschezza; TanStack non deve mai trattenere dati più a lungo del TTL del client. Stagioni concluse `Infinity`; stagione in corso e default globale 30 min (`TTL_CURRENT_EMPTY`, il TTL più breve del client). Un refetch dopo lo staleTime legge IndexedDB e va in rete solo se la voce è scaduta. Default globali: `retry: false` (i retry li fa già il client), `refetchOnWindowFocus: false`. Gli hook delle fasi successive usano `seasonStaleTime(season, anno)` per dati per stagione.
- *Test*: `src/test/setup.ts` sostituisce `fetch` con una risposta 418 immediata, così nessun test può chiamare l'API vera.

## Fase 3 – Classifiche
- Tab Piloti / Costruttori, selettore stagione
- Tabella: posizione, nome, team, punti, vittorie
- Grafico a linee dell'andamento punti gara per gara per i primi N (default 5, selezionabili)
  - calcolarlo dai risultati della stagione (`getSeasonResults`), con funzione pura in `src/lib/` testata
- Nota: la classifica costruttori esiste solo dal 1958

**Fatto quando:** classifiche e grafico sono corretti per la stagione corrente e per una storica; i punti cumulati calcolati coincidono con la classifica finale ufficiale.

## Fase 4 – Risultati
- Pagina del singolo GP (raggiungibile da calendario): risultato gara, qualifiche, sprint se presente
- Colonne gara: posizione, pilota, team, griglia, posizioni guadagnate/perse, tempo o stato, punti, giro veloce
- Navigazione GP precedente / successivo

**Fatto quando:** funziona per gare recenti, gare con sprint e gare anni '50 con dati parziali, senza errori.

## Fase 5 – Testa a testa: dati e statistiche
Solo logica e test, niente interfaccia.
- Funzioni pure in `src/lib/headToHead.ts`, per ciascun pilota:
  - gare, vittorie, podi, pole, giri veloci, ritiri, titoli mondiali, stagioni, team
  - percentuali per gara (vittorie %, podi %, pole %)
  - miglior piazzamento in campionato e stagione per stagione
- Confronto diretto nelle gare corse **insieme**: chi è arrivato davanti (in gara e in qualifica)
- Se sono stati compagni di squadra: confronto nelle sole stagioni da compagni
- Test con dati di esempio scritti a mano

**Fatto quando:** i test passano e i numeri per due piloti noti (es. Senna e Prost) coincidono con fonti attendibili.

## Fase 6 – Testa a testa: interfaccia e grafici
- Due selettori con ricerca tra tutti i piloti della storia
- Card affiancate con le statistiche principali, evidenziando chi è avanti
- Grafici:
  - barre affiancate: vittorie, podi, pole, titoli
  - linee: posizione finale in campionato per anno di carriera (anno 1, 2, 3…), così si confrontano carriere di epoche diverse
  - barre: percentuali per gara
  - se hanno corso insieme: conteggio "davanti all'altro" in gara e in qualifica
- Avviso visibile sui punti non confrontabili tra epoche
- Indicatore di caricamento chiaro (il primo caricamento di un pilota può richiedere qualche secondo)

**Fatto quando:** il confronto funziona per due contemporanei (Hamilton–Verstappen), due di epoche diverse (Fangio–Schumacher) e due ex compagni (Senna–Prost).

## Fase 7 – Rifinitura e pubblicazione
- Layout responsive (telefono e desktop)
- Tema scuro
- Revisione accessibilità: contrasto, navigazione da tastiera, etichette dei grafici
- Pagina 404 e gestione errori globale
- Revisione complessiva del codice
- Pubblicazione (es. Vercel o Netlify)

- Rimuovere o nascondere la pagina di prova `/dev/dati` (Fase 1)

**Fatto quando:** l'app è online e utilizzabile da telefono.

---

## Idee per dopo
- Pagina pilota singolo con tutta la carriera
- Confronto tra team
- Mappe dei circuiti
- Dati di telemetria recenti tramite OpenF1
