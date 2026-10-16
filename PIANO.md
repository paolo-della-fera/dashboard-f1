# Piano di sviluppo – Dashboard F1

Una fase per sessione. Dopo ogni fase: verifica manuale → test e lint → commit → aggiorna lo stato qui sotto.

## Stato
- [x] Fase 0 – Setup del progetto
- [x] Fase 1 – Livello dati (client API)
- [x] Fase 2 – Calendario
- [x] Fase 3 – Classifiche
- [x] Fase 4 – Risultati
- [x] Fase 5 – Testa a testa: dati e statistiche
- [x] Fase 6 – Testa a testa: interfaccia e grafici
- [x] Fase 6b – Animazioni
- [ ] Fase 7 – Rifinitura e pubblicazione
  - [x] 7a – Pulizia del codice e robustezza
  - [x] 7b – Responsive
  - [ ] 7c – Tema scuro e accessibilità
  - [ ] 7d – Revisione finale e pubblicazione

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
- *Funzioni pubbliche*: `src/api/index.ts`. Pagina di prova `/dev/dati`, solo con `npm run dev` (Fase 7a).
- Nota: Jolpica non accetta `drivers/{id}/driverStandings/` senza stagione, quindi `getDriverSeasonStandings` legge prima `drivers/{id}/seasons/` e poi la classifica completa di ogni stagione (`{stagione}/driverStandings/`, la stessa voce di cache di `getDriverStandings`), tenendo la riga del pilota: le stagioni sono condivise tra piloti e con la pagina Classifiche (in cache per sempre per le stagioni concluse). Il `round` delle `StandingsList` restituite è vuoto (la cache della classifica tiene solo le righe); `headToHead.ts` non lo usa.

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
- Grafico a linee dell'andamento punti gara per gara per i primi N (default 5; scelta tra 3, 5, 8)
  - costruito dalle **classifiche ufficiali dopo ogni gara** (una richiesta per round), con funzione pura in `src/lib/` testata. Scelta fatta al posto della somma dei risultati (`getSeasonResults`): la somma non coincide con la classifica ufficiale nelle stagioni con scarti (fino al 1990), con la regola "una sola auto a punti" dei costruttori 1958-78, con le sprint e con le squalifiche (Schumacher 1997, McLaren 2007)
- Nota: la classifica costruttori esiste solo dal 1958

**Fatto quando:** classifiche e grafico sono corretti per la stagione corrente e per una storica; i punti cumulati calcolati coincidono con la classifica finale ufficiale.

**Come funziona (riepilogo):**
- *API* (`src/api/index.ts`): nuove `getDriverStandingsAfterRound(season, round)` e `getConstructorStandingsAfterRound(season, round)` (`/{stagione}/{round}/driverStandings/`), stessa cache delle altre funzioni per stagione.
- *Logica* (`src/lib/standings.ts`): `completedRounds` (gare concluse dal calendario), `topSeries` (primi N), `buildPointsProgression` (una riga per gara; un pilota assente in una gara mantiene i punti precedenti, 0 prima della prima apparizione), `positionLabel` ("SQ" per `positionText` "D"), `parsePoints` (decimali anni '50). Colori delle linee in `src/lib/chartColors.ts`: 8 colori fissi, verificati per il daltonismo, per questo N massimo è 8.
- *Hook* (`src/hooks/useStandings.ts`): `useStandings` (tabella) e `useStandingsHistory` (grafico: calendario → round conclusi → una richiesta per round, round ancora senza classifica scartati). Il grafico parte solo dopo che la tabella è arrivata; quello costruttori solo quando si apre il tab.
- *Pagina*: parametri `?stagione=AAAA&tipo=costruttori`; tabella e grafico hanno stati di caricamento/errore separati. Costruttori prima del 1958: messaggio, nessuna chiamata.
- *Costo*: ~16-24 richieste per stagione e per tipo alla prima apertura; stagioni concluse in cache per sempre.
- Verificato sui dati reali: 1988 finisce con Senna 90 e Prost 87 (punti conteggiati), 1997 Schumacher "SQ", 2026 classifica dopo l'ultimo round uguale alla classifica attuale (sprint comprese).

## Fase 4 – Risultati
- Pagina del singolo GP (raggiungibile da calendario): risultato gara, qualifiche, sprint se presente
- Colonne gara: posizione, pilota, team, griglia, posizioni guadagnate/perse, tempo o stato, punti, giro veloce
- Navigazione GP precedente / successivo

**Fatto quando:** funziona per gare recenti, gare con sprint e gare anni '50 con dati parziali, senza errori.

**Come funziona (riepilogo):**
- *Rotte*: `/risultati/:season/:round` con `?sessione=qualifiche|sprint` (default gara). `/risultati` (anche `?stagione=AAAA`, usato dal selettore stagione) reindirizza all'ultimo GP concluso; prima della prima gara della stagione corrente, all'ultimo della stagione precedente (`src/pages/LatestResultsRedirect.tsx`).
- *Pagina*: intestazione dal calendario (visibile anche senza risultati); tab Sprint solo se il calendario ha `Sprint`; ogni sessione si scarica solo all'apertura del suo tab (hook in `src/hooks/useResults.ts`). GP futuri: nessuna richiesta di risultati. Parametri non validi o round fuori calendario: "Gran Premio non trovato", nessuna richiesta. Navigazione precedente/successivo entro la stagione (successivo solo se già corso), mantiene la sessione; selettori stagione + GP (solo GP conclusi).
- *Logica* (`src/lib/results.ts`): distacco in giri calcolato da `laps` rispetto al vincitore (nei dati recenti i doppiati hanno `status` "Lapped" e un `Time` fuorviante, es. "+4.659"); stati tradotti in italiano per i casi comuni, quelli rari restano come da API. `grid` "0" = "Box", tranne per chi non è partito (W/F, che hanno anch'essi griglia 0). Codici di posizione: Rit., SQ, Escl., NP, NQ, NC, con legenda sotto la tabella. Colonna giro veloce nascosta se nessun pilota ce l'ha (dati dal 2004); il più veloce in viola. Qualifiche: solo le colonne Q1–Q3 con dati (stringhe vuote ignorate, es. 2005), "Tempo" se c'è una sola sessione; se mancano (prima del 1994) messaggio che rimanda alla colonna Griglia.
- *Anni '50*: con le guide condivise lo stesso pilota può comparire più volte nella stessa gara, quindi le righe usano indice + driverId come chiave.
- *Costo*: 1 richiesta per sessione aperta (+ calendario, di solito già in cache).

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

**Definizioni** (fonte: `getDriverResults`, `getDriverQualifying`, `getDriverSeasonStandings`; chiave di una gara = stagione + round; righe filtrate per `driverId`):
- *Riga rappresentativa* di un pilota in una gara (guide condivise anni '50, più righe nella stessa gara): tra le righe in cui è partito, quella classificata con la posizione migliore; se nessuna è classificata, quella con `position` più basso.
- *Partito*: almeno una riga con `positionText` diverso da "W" (non partito) e "F" (non qualificato).
- *Classificato*: `positionText` numerico. "R", "D", "E", "N" non sono classificati.
- **Gare** = gare in cui è partito. I DNQ non si contano (spesso mancano del tutto dai dati, es. Senna San Marino 1984): si mostrano le partenze, non le iscrizioni. Nota: in casi limite (ritiro nel giro di formazione o subito dopo il via, segnati "W" nei dati) le partenze possono differire di 1-2 dalle fonti ufficiali (es. Prost 198 contro 199).
- **Vittorie** = gare con riga rappresentativa in posizione 1 (guide condivise comprese).
- **Podi** = gare con riga rappresentativa classificata in posizione 1–3.
- **Pole** = per ogni gara partita: posizione 1 in qualifica se il pilota ha dati di qualifica per quella gara (dal 1994), altrimenti `grid` "1". Eccezione: nelle gare con sprint del 2021 (round 10, 14, 19) la pole ufficiale andava al vincitore della sprint, quindi si usa `grid` "1".
- **Giri veloci** = gare con `FastestLap.rank` "1". I dati ci sono solo dal 2004: si restituisce anche il numero di gare coperte e un flag `partial` se la carriera inizia prima; `null` ("n.d.") se nessuna gara è coperta (es. Senna, Prost).
- **Ritiri** = gare partite con riga rappresentativa `positionText` "R". Chi ha un guasto ma è classificato non è un ritiro; squalifiche (D), esclusioni (E) e non classificati (N) non sono ritiri.
- **Percentuali** (vittorie %, podi %, pole %) = conteggio / gare partite; `null` con 0 gare.
- **Stagioni** = stagioni con almeno una gara partita.
- **Team** = scuderie delle gare partite, in ordine di prima apparizione, ciascuna con le sue stagioni.
- *Ultima stagione conclusa* = anno corrente se tutte le sue gare sono passate (`raceStatus`), altrimenti anno precedente.
- **Titoli mondiali** = stagioni concluse con posizione finale 1 nella classifica piloti (la stagione in corso non conta anche se è primo; Schumacher 1997 "D" non conta).
- **Miglior piazzamento in campionato** = posizione numerica migliore tra le stagioni concluse, con le stagioni in cui l'ha ottenuta; `null` se nessuna.
- **Stagione per stagione** = per ogni stagione con gare o classifica: team, gare, vittorie, podi, pole, posizione in campionato ("SQ" se escluso, "NC" se in classifica senza posizione, es. Senna 1994, "—" se assente), punti ufficiali (**non confrontabili tra epoche**), flag `provisional` per la stagione non conclusa.
- I punti totali di carriera non vengono calcolati.

*Confronto diretto* (solo gare in cui sono partiti **entrambi**):
- **Gara**: se entrambi classificati, davanti chi ha la posizione migliore; se uno solo è classificato, davanti lui; se nessuno dei due, non conta e va nel contatore `bothUnclassified`.
- **Qualifica**: posizione in qualifica se entrambi hanno dati per quella gara; altrimenti `grid` se entrambi hanno griglia ≥ 1; altrimenti non conta. `fromGrid` dice quanti confronti vengono dalla griglia.
- **Compagni di squadra**: gare partite da entrambi con almeno una scuderia in comune tra le loro righe (gestisce i cambi di team a metà stagione). Su queste gare: stesso confronto gara/qualifica, più per ogni stagione da compagni team, numero di gare, posizione e punti in campionato di entrambi (qui i punti sono confrontabili: stessa stagione).

**Come funziona (riepilogo):**
- *Logica* (`src/lib/headToHead.ts`): `driverStats(career, lastConcluded)`, `headToHead(a, b)`, `lastConcludedSeason(currentYear, schedule, now)`. `career` = `{ driverId, results, qualifying, standings }`, cioè le tre risposte delle funzioni per pilota. Nessun hook né pagina: lo scaricamento dei dati (`useHeadToHead`) è della Fase 6.
- *Test* (`src/lib/__tests__/headToHead.test.ts`): dati scritti a mano per guide condivise, W/F, ritiri, D/E/N, pole da qualifica/griglia/sprint 2021, giri veloci prima e dopo il 2004, stagione in corso, NC, cambio team a metà stagione, piloti mai insieme.
- *Verifica sui dati reali* (script temporaneo, non nel repo), confrontata con Wikipedia:
  - Senna: 161 gare, 41 vittorie, 80 podi, 65 pole, titoli 1988/1990/1991, 11 stagioni: tutto coincide.
  - Prost: 51 vittorie, 106 podi, 33 pole, titoli 1985/1986/1989/1993, 13 stagioni: coincide. Gare **198** contro 199 di Wikipedia: i dati segnano "W" (0 giri) sia Australia 1989 ("Withdrew") sia San Marino 1991 ("Spun off", testacoda nel giro di formazione); Wikipedia ne conta uno dei due come partenza. Si seguono i dati.
  - Giri veloci n.d. per entrambi (Wikipedia: Senna 19, Prost 41): mancano nei dati prima del 2004.
  - Compagni McLaren 1988–89: 31 gare; qualifica Senna 27–4 (sulla griglia); gara Senna 17–13, 1 gara con entrambi non classificati. Tutte le 139 gare insieme confrontate in qualifica sulla griglia (nessun dato di qualifica prima del 1994).

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

**Come funziona (riepilogo):**
- *Rotta*: `/testa-a-testa?pilota1=senna&pilota2=prost` (confronto condivisibile, il tasto indietro funziona). Senza piloti: 4 confronti famosi cliccabili (`FAMOUS_MATCHUPS`). Stesso pilota due volte: "Scegli due piloti diversi"; ID assente dall'elenco piloti: "Pilota non trovato".
- *Hook* (`src/hooks/useHeadToHead.ts`): `useAllDrivers` (elenco per la ricerca) e `useDriverCareer` (risultati + qualifiche + classifiche per stagione in parallelo → `DriverCareer`). Ultima stagione conclusa da `lastConcludedSeason` sul calendario dell'anno corrente (finché non arriva: anno precedente). La carriera parte subito, senza aspettare l'elenco piloti: un ID non valido costa 3 richieste vuote, in cambio i caricamenti validi non aspettano le ~9 pagine dell'elenco.
- *Avanzamento*: `fetchAll` e le tre funzioni per pilota accettano un `ProgressTracker` opzionale (`src/api/progress.ts`); senza tracker il comportamento è invariato. Si contano solo le richieste di rete (non la cache); il totale cresce mentre si scoprono pagine e stagioni. Lo store per pilota (`src/hooks/careerProgress.ts`, `useSyncExternalStore`) alimenta "Senna: 12 di 28 richieste" + barra.
- *Logica di vista* (`src/lib/headToHeadView.ts`): ricerca senza accenti/maiuscole con tutte le parole (cognome che inizia con la query per primo), evidenziazione di chi è avanti (vittorie, podi, pole, titoli, percentuali, miglior piazzamento; giri veloci solo se entrambe le carriere sono coperte dal 2004; gare/ritiri/stagioni mai), nota "dati disponibili dal 2004" (n.d. o parziale con gare coperte), percentuali all'italiana, stagioni compatte ("1988, 1990–1991"), nomi brevi nei grafici (nome completo se stesso cognome).
- *Grafici*: barre affiancate vittorie/podi/pole/titoli e percentuali per gara; linee posizione in campionato per anno di carriera (anno = stagione − prima stagione + 1, quindi le pause restano buchi; SQ/NC senza punto; asse invertito, 1 in alto); confronto "davanti all'altro" in gara e qualifica (con gare non contate e confronti decisi sulla griglia), sezione compagni con tabella stagioni (punti confrontabili). Tabelle stagione per stagione in `<details>` con avviso sui punti non confrontabili tra epoche.
- *Verifica sui dati reali* (script temporaneo, non nel repo): ID dei 4 confronti famosi presenti nell'elenco piloti. Senna–Prost come in Fase 5 (139 gare insieme, compagni 31: gara 17–13, qualifica 27–4; giri veloci n.d.). Hamilton–Verstappen: 249 gare insieme, gara 134–113, qualifica 137–112, nessuna sezione compagni, giri veloci senza nota. Avanzamento coerente (Senna 15/15, Hamilton 29/29). Fangio–Schumacher non completato per risposte 429 del server: da controllare nel browser.

## Fase 6b – Animazioni
- Libreria: Motion (installazione autorizzata in questa fase)
- Transizioni morbide tra le pagine
- Card e righe delle tabelle che compaiono in sequenza al caricamento
- Numeri delle statistiche (testa a testa, classifiche) che contano fino al valore finale
- Effetti al passaggio del mouse su card e link
- Animazione di ingresso dei grafici Recharts, coerente con il resto
- Rispetto dell'impostazione "riduci movimento" del sistema: animazioni disattivate o ridotte al minimo
- Durate brevi (indicativamente sotto i 400 ms), niente animazioni che rallentano la lettura dei dati

**Fatto quando:** tutte le pagine hanno animazioni coerenti, con "riduci movimento" attivo non si muove nulla di superfluo, test e lint passano.

**Come funziona (riepilogo):**
- *Libreria*: `motion` (import da `motion/react`).
- *Tempi* (`src/lib/motion.ts`, con test): pagina 200 ms, card/righe 200 ms, conteggio numeri 350 ms, grafici Recharts 350 ms `ease-out`. Comparsa in sequenza con `appear(index)`: ritardo 30 ms per elemento, massimo 180 ms, quindi anche una tabella di 20+ righe è completa entro ~380 ms.
- *Transizione tra pagine* (`src/components/PageTransition.tsx`, in `Layout`): dissolvenza + 6px in su, solo in ingresso (la pagina nuova non aspetta l'uscita della vecchia). Chiave = prima parte del percorso: cambiare GP, stagione o piloti non la ripete.
- *Comparsa in sequenza*: righe di calendario, classifiche, risultati, qualifiche, compagni di squadra e stagione per stagione (`motion.tr`); card prossima gara, card piloti, confronti famosi, blocchi "davanti all'altro". Le chiavi delle righe non cambiano, quindi una riga già presente non ricompare.
- *Numeri che contano* (`src/hooks/useCountUp.ts`, `src/components/CountUp.tsx`): card del testa a testa (percentuali in punti percentuali interi, valore esatto alla fine), conteggi "davanti all'altro" (con la barra divisa che parte dal 50%), punti e vittorie nelle classifiche. Valori intermedi interi, valore finale esatto (decimali compresi). Al cambio di valore (es. cambio stagione) conta dal valore mostrato. Non contano: "n.d.", "—", miglior piazzamento, tabelle risultati e stagioni.
- *Hover*: card con ombra (e sollevamento di 2px solo con `motion-safe`), link e tab con `transition-colors` 150 ms.
- *Riduci movimento*: `MotionConfig reducedMotion="user"` in `main.tsx` (niente spostamenti, al più dissolvenza); conteggi, barra divisa e grafici usano `useReducedMotion()` e mostrano subito il valore finale; `index.css` azzera le transizioni CSS.
- *Test*: `src/test/setup.ts` imposta `MotionGlobalConfig.skipAnimations = true`, così i test vedono subito i valori finali; `CountUp.test.tsx` riattiva le animazioni per verificare il conteggio.

## Fase 7 – Rifinitura e pubblicazione
Divisa in quattro sotto-fasi, una per sessione, ciascuna con il suo commit, nell'ordine indicato:
- prima le modifiche strutturali (rotte, caricamento separato, pagine di errore), che cambiano l'albero dei componenti su cui lavorano le fasi visive;
- poi il responsive, così il layout si sistema una volta sola;
- poi tema scuro e accessibilità insieme, perché il contrasto va verificato su entrambi i temi;
- infine revisione e pubblicazione, con gli screenshot del README presi dall'interfaccia definitiva.

**Fatto quando (Fase 7 completa):** l'app è online e utilizzabile da telefono.

### 7a – Pulizia del codice e robustezza
- Rimuovere o nascondere la pagina di prova `/dev/dati` (Fase 1)
- Pagina 404 e gestione errori globale (error boundary)
- Bundle JS oltre 500 kB (soprattutto Recharts, dalla Fase 3): caricamento separato delle pagine (`import()` dinamico), verificando che la transizione tra pagine (`PageTransition`, Fase 6b) resti corretta
- Unificare `championshipLabel` (headToHead.ts) e `positionLabel` (standings.ts)
- Limiti Jolpica per IP, destinati a diminuire: ridurre le richieste invece di rallentare la coda. Fatto: classifiche stagione per stagione del pilota lette dalla classifica completa della stagione, condivisa tra piloti e con Classifiche (es. Senna–Prost: 1984–1993 scaricate una volta sola). Da valutare: ricavare le stagioni di un pilota da `getDriverResults` invece di `drivers/{id}/seasons/` (una richiesta in meno per pilota, ma in sequenza).

**Fatto quando:** `/dev/dati` non è raggiungibile in produzione; un URL inesistente mostra la 404; un errore di rendering mostra un messaggio invece della pagina bianca; `npm run build` senza avviso sui 500 kB (o con motivazione scritta qui); test e lint passano.

**Come funziona (riepilogo):**
- *Caricamento separato* (`src/App.tsx`): le quattro pagine con `lazy(() => import(...))`; `LatestResultsRedirect` e `NotFoundPage` restano nel bundle principale. In `Layout`: `ErrorBoundary > Suspense > PageTransition > Outlet`. `Suspense` sta fuori dalla transizione, così la dissolvenza parte quando la pagina è arrivata e non sul messaggio "Caricamento…".
- *Build* (prima un solo file da 878 kB): chunk più grande 366 kB (Recharts, che Vite chiama `chartColors-*` dal primo modulo del gruppo), principale 221 kB, `calendar-*` 222 kB (codice condiviso tra le pagine, Motion compreso), pagine 5–49 kB. Nessun avviso, `manualChunks` non serve.
- *`/dev/dati`*: rotta e import solo se `import.meta.env.DEV`. In produzione la condizione vale `false`, il chunk non viene creato (verificato con grep su `dist/`) e l'indirizzo apre la 404.
- *404* (`src/pages/NotFoundPage.tsx`): rotta `*` dentro `Layout`, con la navigazione visibile e un link al calendario.
- *Errori* (`src/components/ErrorBoundary.tsx`): è un componente a classe, unica eccezione alla regola, perché React non ha un hook per gli error boundary. Mostra un messaggio con "Ricarica la pagina" e un link al calendario, e copre anche un chunk che non si scarica dopo un nuovo deploy. In `Layout` `resetKey` = percorso: dopo un errore basta cambiare pagina. Un secondo boundary in `main.tsx` copre gli errori del layout.
- *Posizione in campionato*: una sola `positionLabel` in `src/lib/standings.ts`, usata dalle classifiche e da `headToHead.ts` (`championshipLabel` eliminata). Restituisce "—" senza riga o senza posizione, "SQ" per "D", la posizione se `positionText` è numerico, altrimenti "NC".
- *Stagioni del pilota da `getDriverResults`*: **non fatto**. Si risparmierebbe una sola richiesta per pilota, già in cache per 24 h, ma le classifiche per stagione dovrebbero aspettare tutte le pagine dei risultati invece di partire in parallelo.

### 7b – Responsive
- Layout responsive (telefono da 360px e desktop), compresa la barra di navigazione
- Calendario: su telefono nascondere le colonne circuito e paese (o trasformare le righe in card)
- Risultati: su telefono (360px) nascondere nella tabella gara/sprint le colonne giro veloce e +/− (Fase 4: 8 colonne, ora scorre in orizzontale)
- Controllo di classifiche, testa a testa e grafici a 360px
- Controllo delle animazioni (Fase 6b) su telefono

**Fatto quando:** tutte le pagine sono usabili a 360px senza scorrimento orizzontale della pagina (eventuali tabelle scorrevoli solo se motivate); test e lint passano.

**Come funziona (riepilogo):**
- *Breakpoint*: solo `sm` (640px) di Tailwind; sotto è "telefono". Nessuna logica nuova, solo classi.
- *Aree da toccare ≥ 44px* (`min-h-11`, testo centrato in verticale): voci della navigazione, tab Piloti/Costruttori e Gara/Qualifiche/Sprint, link GP precedente/successivo. Regola da mantenere per i nuovi controlli.
- *Intestazione*: su telefono titolo sopra e navigazione in una riga di 4 colonne uguali (testo `xs`, "Testa a testa" può andare a capo); da `sm` come prima.
- *Colonne nascoste su telefono* (`hidden sm:table-cell`): Calendario → Circuito e Paese (sono nell'intestazione della pagina Risultati); Risultati gara/sprint → +/− e Giro veloce (con la legenda "Viola"). Team in risultati e qualifiche: colonna nascosta e scuderia in piccolo sotto il nome del pilota (`sm:hidden`); una delle due versioni è sempre `display: none`, quindi lo screen reader non la legge due volte.
- *Grafici linea* (andamento punti, posizione per anno di carriera): niente più larghezza minima con scorrimento interno; occupano la larghezza disponibile e Recharts dirada le etichette dell'asse X (`interval="preserveStartEnd"`, `minTickGap`), il tooltip dà il dettaglio. Andamento punti alto 256px su telefono, 320px da `sm`.
- *Tabelle che possono ancora scorrere (solo la tabella, mai la pagina)*: qualifiche con Q1–Q3 (tre tempi da confrontare, ~340px) e "stagione per stagione" del testa a testa (8 colonne numeriche, dentro un `<details>` chiuso di default). Le altre tabelle stanno in 328px.
- *Animazioni*: `appear` e la transizione pagina spostano solo in verticale, nessun overflow orizzontale; con Tailwind v4 gli effetti `hover:` valgono solo su dispositivi con puntatore, quindi niente hover "bloccato" al tocco.

### 7c – Tema scuro e accessibilità
- Tema scuro (da decidere a inizio sessione: solo preferenza di sistema o anche interruttore)
- Colori del grafico classifiche (`src/lib/chartColors.ts`) e degli altri grafici per il tema scuro
- Ombre al passaggio del mouse delle card (Fase 6b) da rivedere sullo sfondo scuro
- Revisione accessibilità: contrasto (su entrambi i temi), navigazione da tastiera, etichette dei grafici

**Fatto quando:** tutte le pagine leggibili in tema chiaro e scuro, contrasto almeno AA, tutte le funzioni usabili da tastiera; test e lint passano.

### 7d – Revisione finale e pubblicazione
- Revisione complessiva del codice
- Prima di rendere pubblico il repository:
  - README con descrizione del progetto, screenshot, istruzioni per avviarlo e la nota "Progetto non ufficiale, non affiliato con Formula 1. Dati forniti da Jolpica F1 API"
  - File LICENSE (MIT)
  - Controllo che non ci siano dati personali o segreti nel codice e nella cronologia
- Pubblicazione su Vercel (o Netlify): aggiungere `vercel.json` con la regola che reindirizza tutte le rotte a `index.html`

**Fatto quando:** l'app è online e utilizzabile da telefono.

---

## Idee per dopo
- Pagina pilota singolo con tutta la carriera
- Confronto tra team
- Mappe dei circuiti
- Dati di telemetria recenti tramite OpenF1
