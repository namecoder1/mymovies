# 🎬 Famflix - Guida Setup Completa

Benvenuto! Questa guida ti aiuterà a installare e avviare Famflix sul tuo computer in modo semplice e veloce.

## 📋 Cosa ti serve

Prima di iniziare, assicurati di avere:

1. **Un computer** (Mac, Windows o Linux)
2. **Connessione internet**
3. **Accesso alla repository GitHub** (il tuo amico ti darà i permessi)
4. **Credenziali di configurazione** (il tuo amico te le fornirà):
   - URL Supabase
   - Chiave Supabase
   - API Token TMDB

---

## 🚀 Installazione - Passo per Passo

### Passo 1: Installa Docker Desktop

Docker è un programma che ti permette di far girare l'applicazione senza dover installare Node.js o altre dipendenze complicate.

#### Su Mac:
1. Vai su [https://docs.docker.com/desktop/install/mac-install/](https://docs.docker.com/desktop/install/mac-install/)
2. Scarica Docker Desktop per Mac (scegli la versione giusta per il tuo processore: Intel o Apple Silicon)
3. Apri il file `.dmg` scaricato e trascina Docker nella cartella Applicazioni
4. Apri Docker Desktop dalla cartella Applicazioni
5. Segui la procedura guidata di installazione
6. **Importante**: Lascia Docker Desktop aperto (deve essere in esecuzione)

#### Su Windows:
1. Vai su [https://docs.docker.com/desktop/install/windows-install/](https://docs.docker.com/desktop/install/windows-install/)
2. Scarica Docker Desktop per Windows
3. Esegui il file di installazione
4. Segui la procedura guidata (potrebbe richiedere il riavvio del computer)
5. Apri Docker Desktop
6. **Importante**: Lascia Docker Desktop aperto (deve essere in esecuzione)

#### Su Linux:
1. Vai su [https://docs.docker.com/desktop/install/linux-install/](https://docs.docker.com/desktop/install/linux-install/)
2. Segui le istruzioni per la tua distribuzione Linux

**Come verificare che Docker funzioni:**
- Apri il Terminale (Mac/Linux) o PowerShell (Windows)
- Digita: `docker --version`
- Dovresti vedere qualcosa come: `Docker version 24.x.x`

---

### Passo 2: Scarica il Codice da GitHub

#### Opzione A: Se hai Git installato

1. Apri il Terminale (Mac/Linux) o PowerShell (Windows)
2. Vai nella cartella dove vuoi salvare il progetto, ad esempio:
   ```bash
   cd Desktop
   ```
3. Clona la repository:
   ```bash
   git clone https://github.com/TUOAMICO/famflix.git
   ```
   *(Sostituisci `TUOAMICO` con il nome utente GitHub del tuo amico)*
4. Entra nella cartella del progetto:
   ```bash
   cd famflix
   ```

#### Opzione B: Se NON hai Git (più semplice)

1. Vai sulla pagina GitHub della repository (il tuo amico ti darà il link)
2. Clicca sul pulsante verde **"Code"**
3. Seleziona **"Download ZIP"**
4. Salva il file ZIP sul tuo computer (ad esempio sul Desktop)
5. Estrai il file ZIP (doppio click su Mac, tasto destro → Estrai su Windows)
6. Rinomina la cartella estratta in `famflix` se necessario
7. Apri il Terminale/PowerShell e vai nella cartella:
   ```bash
   cd Desktop/famflix
   ```

---

### Passo 3: Configura le Credenziali

Ora devi creare un file speciale chiamato `.env.local` che contiene le credenziali per far funzionare l'app.

#### Su Mac/Linux:

1. Apri il Terminale e assicurati di essere nella cartella `famflix`:
   ```bash
   cd /percorso/dove/hai/salvato/famflix
   ```

2. Crea il file `.env.local`:
   ```bash
   nano .env.local
   ```

3. Copia e incolla questo contenuto (sostituisci i valori con quelli che ti ha dato il tuo amico):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=la-tua-chiave-supabase-qui
   API_TOKEN_TMDB=la-tua-api-key-tmdb-qui
   ```

4. Salva il file:
   - Premi `CTRL + O` (per salvare)
   - Premi `INVIO` (per confermare)
   - Premi `CTRL + X` (per uscire)

#### Su Windows:

1. Apri il Blocco Note (Notepad)
2. Copia e incolla questo contenuto (sostituisci i valori con quelli che ti ha dato il tuo amico):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=la-tua-chiave-supabase-qui
   API_TOKEN_TMDB=la-tua-api-key-tmdb-qui
   ```
3. Vai su **File → Salva con nome**
4. Nella finestra di salvataggio:
   - Nome file: `.env.local` (con il punto all'inizio!)
   - Tipo file: **Tutti i file (*.*)**
   - Posizione: la cartella `famflix` che hai scaricato
5. Clicca **Salva**

**⚠️ IMPORTANTE**: Il file deve chiamarsi esattamente `.env.local` (con il punto all'inizio) e deve essere nella cartella principale di `famflix`.

---

### Passo 4: Avvia l'Applicazione

Ora sei pronto per avviare Famflix!

#### Su Mac (Metodo Semplice):

1. Nella cartella `famflix`, trova il file chiamato `start.command`
2. **Doppio click** su `start.command`
3. Se il Mac ti chiede il permesso, vai su **Preferenze di Sistema → Sicurezza e Privacy** e clicca **Apri comunque**
4. Vedrai una finestra del Terminale che mostra il processo di avvio
5. Aspetta qualche minuto (la prima volta ci vuole più tempo perché deve scaricare tutto)
6. Quando vedi "✅ Server is running!" sei pronto!

#### Su Mac/Windows/Linux (Metodo Manuale):

1. Apri il Terminale (Mac/Linux) o PowerShell (Windows)
2. Vai nella cartella `famflix`:
   ```bash
   cd /percorso/dove/hai/salvato/famflix
   ```
3. Esegui questo comando:
   ```bash
   docker-compose --env-file .env.local up -d --build
   ```
4. Aspetta che finisca (la prima volta può richiedere 5-10 minuti)
5. Quando il comando termina, l'applicazione è in esecuzione!

**Cosa succede durante il primo avvio:**
- Docker scarica tutte le dipendenze necessarie
- Costruisce l'immagine dell'applicazione
- Avvia il server
- **Questo processo è lento solo la prima volta!** Le volte successive sarà molto più veloce.

---

### Passo 5: Accedi all'Applicazione

1. Apri il tuo browser preferito (Chrome, Safari, Firefox, ecc.)
2. Vai all'indirizzo: **http://localhost:3000**
3. Dovresti vedere la schermata di login di Famflix! 🎉

---

## 🔄 Come Usare Famflix Ogni Giorno

### Avviare Famflix:

**Su Mac:**
- Assicurati che Docker Desktop sia aperto
- Doppio click su `start.command`
- Aspetta qualche secondo
- Vai su http://localhost:3000

**Su Windows/Linux:**
- Assicurati che Docker Desktop sia aperto
- Apri Terminale/PowerShell
- Vai nella cartella `famflix`
- Esegui: `docker-compose up -d`
- Vai su http://localhost:3000

### Fermare Famflix:

Quando hai finito di usare l'app:

1. Apri il Terminale/PowerShell
2. Vai nella cartella `famflix`
3. Esegui:
   ```bash
   docker-compose down
   ```

Oppure:
- Apri Docker Desktop
- Vai nella sezione "Containers"
- Trova `famflix-app`
- Clicca sul pulsante "Stop"

---

## 🔧 Risoluzione Problemi

### Problema: "Docker non è in esecuzione"

**Soluzione:**
- Apri Docker Desktop e aspetta che si avvii completamente
- Vedrai l'icona di Docker nella barra in alto (Mac) o nella system tray (Windows)
- Riprova il comando

### Problema: "Porta 3000 già in uso"

**Soluzione:**
- Qualche altro programma sta usando la porta 3000
- Chiudi altri server o applicazioni web che potrebbero usare quella porta
- Oppure modifica il file `docker-compose.yml` cambiando `"3000:3000"` in `"3001:3000"` e accedi a http://localhost:3001

### Problema: "Cannot find .env.local"

**Soluzione:**
- Assicurati di aver creato il file `.env.local` nella cartella principale di `famflix`
- Controlla che il nome sia esatto: `.env.local` (con il punto all'inizio)
- Su Windows, assicurati di non aver salvato il file come `.env.local.txt`

### Problema: "Errore di connessione a Supabase"

**Soluzione:**
- Controlla che le credenziali nel file `.env.local` siano corrette
- Verifica di avere connessione internet
- Chiedi al tuo amico di verificare che il progetto Supabase sia attivo

### Problema: La pagina non si carica

**Soluzione:**
1. Verifica che Docker Desktop sia in esecuzione
2. Apri il Terminale e controlla lo stato del container:
   ```bash
   docker ps
   ```
   Dovresti vedere `famflix-app` nella lista
3. Se non c'è, riavvia con:
   ```bash
   docker-compose up -d
   ```

### Problema: "Build failed" durante l'installazione

**Soluzione:**
- Assicurati di avere abbastanza spazio su disco (almeno 5GB liberi)
- Riavvia Docker Desktop
- Prova a pulire tutto e ricostruire:
  ```bash
  docker-compose down
  docker system prune -a
  docker-compose --env-file .env.local up -d --build
  ```

---

## 📞 Serve Aiuto?

Se hai problemi che non riesci a risolvere:

1. Controlla di nuovo questa guida passo per passo
2. Verifica che Docker Desktop sia in esecuzione
3. Controlla che il file `.env.local` sia corretto
4. Contatta il tuo amico che ti ha condiviso la repository

---

## 🎯 Riepilogo Veloce

Per chi ha già fatto il setup:

1. **Avvia Docker Desktop**
2. **Doppio click su `start.command`** (Mac) o esegui `docker-compose up -d` (Windows/Linux)
3. **Vai su http://localhost:3000**
4. **Buona visione!** 🍿

---

## 📚 Informazioni Aggiuntive

### Aggiornare l'Applicazione

Se il tuo amico aggiorna il codice e vuoi scaricare le modifiche:

```bash
# Ferma l'applicazione
docker-compose down

# Scarica gli aggiornamenti
git pull

# Ricostruisci e riavvia
docker-compose --env-file .env.local up -d --build
```

### Vedere i Log (per debugging)

Se qualcosa non funziona e vuoi vedere cosa sta succedendo:

```bash
docker-compose logs -f
```

Premi `CTRL + C` per uscire dalla visualizzazione dei log.

---

**Buon divertimento con Famflix! 🎬🍿**
