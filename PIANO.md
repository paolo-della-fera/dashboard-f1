# Piano di sviluppo – Dashboard F1

Una fase per sessione. Dopo ogni fase: verifica manuale → test e lint → commit → aggiorna lo stato qui sotto.

## Stato
- [x] Fase 0 – Setup del progetto
- [ ] Fase 1 – Livello dati (client API)
- [ ] Fase 2 – Calendario
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

## Fase 2 – Calendario
- Elenco gare della stagione: round, nome GP, circuito, paese, data
- Gare passate distinte da quelle future; link ai risultati per quelle concluse
- Card "Prossima gara" con countdown
- Selettore di stagione

**Fatto quando:** il calendario è corretto per la stagione corrente e per una stagione storica (es. 1988).

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

**Fatto quando:** l'app è online e utilizzabile da telefono.

---

## Idee per dopo
- Pagina pilota singolo con tutta la carriera
- Confronto tra team
- Mappe dei circuiti
- Dati di telemetria recenti tramite OpenF1
