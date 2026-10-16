# Progetto: Dashboard F1

## Cos'è
Dashboard web di Formula 1 con quattro sezioni:
1. **Calendario** – gare della stagione, prossima gara con countdown
2. **Classifiche** – piloti e costruttori, per qualsiasi stagione, con grafico dell'andamento punti
3. **Risultati** – risultati di gara, qualifiche e sprint per ogni Gran Premio
4. **Testa a testa** – confronto tra due piloti qualsiasi della storia (dal 1950), con statistiche e grafici

Il piano di sviluppo a fasi è in `PIANO.md`. Leggilo all'inizio di ogni sessione.

## Stack
- React + Vite + TypeScript
- Tailwind CSS per lo stile
- React Router per la navigazione
- TanStack Query per il recupero dati e la cache
- Recharts per i grafici
- Vitest + Testing Library per i test

App solo frontend: nessun backend, i dati arrivano direttamente dall'API pubblica.

## Fonte dati: Jolpica F1 API
- Base URL: `https://api.jolpi.ca/ergast/f1/`
- Successore compatibile della vecchia Ergast API (chiusa a inizio 2025): la documentazione Ergast vale ancora per formato e parametri.
- Gli URL devono finire con `/` o `.json`.
- Paginazione: `limit` (default 30, massimo 100) e `offset`. Le risposte contengono `MRData.total`.
- **Limiti di frequenza: 4 richieste al secondo, 500 all'ora.** Tutte le chiamate passano dal client in `src/api/`, che gestisce coda, paginazione e cache. Non fare mai `fetch` diretti dai componenti.
- Dati storici (stagioni concluse) non cambiano mai: vanno messi in cache in modo persistente (IndexedDB/localStorage) senza scadenza. Dati della stagione corrente: cache di qualche ora.

## Struttura cartelle
```
src/
  api/          client Jolpica, paginazione, coda richieste, cache
  types/        tipi TypeScript delle risposte API
  hooks/        hook TanStack Query (useCalendar, useStandings, ...)
  lib/          logica pura: calcoli statistiche, trasformazioni dati per i grafici
  components/   componenti riutilizzabili (tabelle, card, grafici, selettori)
  pages/        una pagina per sezione
```

## Comandi
- Avvio sviluppo: `npm run dev`
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

## Convenzioni
- TypeScript strict, niente `any`
- Componenti React come funzioni, un componente per file
- Logica di calcolo in `src/lib/` come funzioni pure, sempre con test, separata dai componenti
- Test in `__tests__` accanto al file testato; nei test l'API va sempre simulata (mock), mai chiamata davvero
- Testi dell'interfaccia in italiano; codice, nomi di variabili e commenti in inglese
- Ogni pagina gestisce tre stati: caricamento, errore, dati

## Regole importanti
- Non installare nuove dipendenze senza chiedermelo
- Non modificare i test esistenti per farli passare senza chiedermelo
- Prima di dire che un compito è finito: esegui `npm test` e `npm run lint`
- Lavora solo sulla fase indicata in `PIANO.md`; se noti qualcosa da fare in altre fasi, segnalalo invece di farlo
- A fine fase aggiorna lo stato in `PIANO.md`

## Attenzione ai dati storici
- Il sistema di punteggio F1 è cambiato molte volte: i punti totali di piloti di epoche diverse **non sono confrontabili**. Nel testa a testa privilegia vittorie, podi, pole, percentuali per gara e titoli; se mostri i punti, segnalalo chiaramente.
- I dati delle epoche più vecchie possono essere incompleti (es. qualifiche e giri veloci mancanti): gestisci i campi assenti senza errori.
