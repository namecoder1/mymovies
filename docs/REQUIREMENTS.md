# Provider Monitor Service - Requirements

## Obiettivo

Creare un servizio Node.js containerizzato che monitora provider di streaming e aggiorna i risultati su Supabase.

## Contesto

Questo servizio è parte del progetto **FamFlix** (una piattaforma di streaming familiare). I provider di streaming esterni cambiano frequentemente (URL, metodi, a volte chiudono), quindi abbiamo bisogno di un health check automatico ogni X minuti per:

1. Verificare se ogni provider è raggiungibile
2. Misurare il tempo di risposta
3. Aggiornare lo stato su Supabase
4. Esporre API per trigger manuali dall'Admin UI di FamFlix

Il servizio gira in un container Docker separato e comunica solo con Supabase.

---

## Stack Richiesto

- **Runtime**: Node.js 20 LTS con TypeScript
- **Framework**: Express.js per API endpoints
- **Database**: `@supabase/supabase-js` per comunicare con Supabase
- **Scheduler**: `node-cron` per esecuzione periodica
- **HTTP Client**: `undici` o fetch nativo (Node 20+)
- **Container**: Docker (Alpine-based, multi-stage build)

---

## Tabella Supabase Esistente

La tabella `stream_providers` esiste già su Supabase. Ecco le colonne rilevanti che il servizio deve leggere/scrivere:

### Colonne da LEGGERE (per costruire URL di test)
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | uuid | Primary key |
| `key` | text | Identificatore univoco (es. `vixsrc`) |
| `host` | text | URL base (es. `https://vixsrc.to`) |
| `family` | text | Tipo URL: `query-tmdb`, `path-tmdb`, `path-imdb`, `videoid-tmdb` |
| `movie_path_template` | text | Template per film (es. `/movie/{id}`) |
| `tv_path_template` | text | Template per TV (es. `/tv/{id}/{season}/{episode}`) |
| `is_active` | boolean | Se false, non controllare questo provider |
| `consecutive_failures` | integer | Numero fallimenti consecutivi attuali |

### Colonne da SCRIVERE (dopo ogni check)
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `is_healthy` | boolean | Risultato ultimo check |
| `status_code` | integer | HTTP status code (null se errore rete) |
| `response_time_ms` | integer | Tempo risposta in millisecondi |
| `success_rate_24h` | numeric(5,2) | % successo ultime 24h (opzionale, bonus) |
| `consecutive_failures` | integer | Incrementa se fallito, reset a 0 se successo |
| `last_check_at` | timestamptz | Timestamp del check |
| `last_success_at` | timestamptz | Timestamp ultimo successo (aggiorna solo se healthy) |
| `last_failure_reason` | text | Classificazione errore |

---

## Funzionalità Richieste

### 1. Health Check Automatico

Ogni **5 minuti** (configurabile via env), il servizio deve:

1. Fare query a Supabase: `SELECT * FROM stream_providers WHERE is_active = true`
2. Per ogni provider, eseguire un health check
3. Aggiornare i risultati su Supabase

#### Logica Health Check per Singolo Provider

```typescript
// Pseudocodice
const TEST_TMDB_ID = '550'; // Fight Club - contenuto noto sempre presente

function buildTestUrl(provider): string {
  // Sostituisci {id} nel template con TEST_TMDB_ID
  // Es: host = "https://vixsrc.to", template = "/movie/{id}"
  // Risultato: "https://vixsrc.to/movie/550"
  return provider.host + provider.movie_path_template.replace('{id}', TEST_TMDB_ID);
}

async function checkProvider(provider): CheckResult {
  const url = buildTestUrl(provider);
  const start = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Leggero, non scarica body
      headers: { 'User-Agent': 'Mozilla/5.0 ...' },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    
    // Se HEAD restituisce errore, prova GET
    if (!response.ok && response.status !== 405) {
      return await checkWithGet(url, start);
    }
    
    return {
      isHealthy: response.ok,
      statusCode: response.status,
      responseTimeMs: Date.now() - start,
      failureReason: null
    };
  } catch (error) {
    return {
      isHealthy: false,
      statusCode: null,
      responseTimeMs: Date.now() - start,
      failureReason: classifyError(error) // 'timeout', 'dns_error', 'connection_refused'
    };
  }
}
```

#### Classificazione Errori (`last_failure_reason`)

| Errore | Valore |
|--------|--------|
| Timeout (10s+) | `timeout` |
| DNS non risolto | `dns_error` |
| Connessione rifiutata | `connection_refused` |
| HTTP 4xx | `http_4xx` |
| HTTP 5xx | `http_5xx` |
| Altro | `unknown_error` |

---

### 2. Aggiornamento Database

Dopo ogni check di un provider, esegui UPDATE su Supabase:

```typescript
await supabase
  .from('stream_providers')
  .update({
    is_healthy: result.isHealthy,
    status_code: result.statusCode,
    response_time_ms: result.responseTimeMs,
    consecutive_failures: result.isHealthy ? 0 : provider.consecutive_failures + 1,
    last_check_at: new Date().toISOString(),
    last_success_at: result.isHealthy ? new Date().toISOString() : undefined,
    last_failure_reason: result.failureReason
  })
  .eq('id', provider.id);
```

---

### 3. API Endpoints (Express)

Il servizio deve esporre questi endpoint per l'Admin UI di FamFlix:

| Metodo | Path | Descrizione |
|--------|------|-------------|
| `GET` | `/health` | Health check del servizio stesso (per Docker) |
| `GET` | `/api/status` | Stato generale: ultimo check, quanti provider attivi/healthy |
| `POST` | `/api/check-all` | Trigger manuale: controlla tutti i provider adesso |
| `POST` | `/api/check/:key` | Trigger manuale: controlla singolo provider per key |

#### Esempio Response `/api/status`

```json
{
  "service": "provider-monitor",
  "uptime": 3600,
  "lastCheckAt": "2025-01-14T14:00:00Z",
  "nextCheckAt": "2025-01-14T14:05:00Z",
  "providers": {
    "total": 10,
    "active": 6,
    "healthy": 4
  }
}
```

#### Esempio Response `/api/check-all`

```json
{
  "message": "Check completed",
  "duration": 5230,
  "results": [
    { "key": "vixsrc", "isHealthy": true, "responseTimeMs": 234 },
    { "key": "vidsrcCc", "isHealthy": false, "failureReason": "timeout" }
  ]
}
```

---

### 4. Docker Configuration

#### Requisiti Container
- **Base image**: `node:20-alpine` (leggera)
- **Build**: Multi-stage (builder + runner)
- **Memoria max**: 128MB
- **CPU**: 0.25 cores
- **Porta**: 3001

#### Dockerfile (esempio struttura)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'
services:
  provider-monitor:
    build: .
    container_name: famflix-provider-monitor
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - CHECK_INTERVAL_MINUTES=5
      - PORT=3001
      - LOG_LEVEL=info
    mem_limit: 128m
    cpus: 0.25
```

---

## Environment Variables

| Variabile | Richiesta | Default | Descrizione |
|-----------|-----------|---------|-------------|
| `SUPABASE_URL` | ✅ | - | URL del progetto Supabase |
| `SUPABASE_SERVICE_KEY` | ✅ | - | Service role key (non anon!) |
| `CHECK_INTERVAL_MINUTES` | ❌ | `5` | Intervallo tra check automatici |
| `PORT` | ❌ | `3001` | Porta Express |
| `LOG_LEVEL` | ❌ | `info` | Livello log: debug, info, warn, error |

---

## Struttura Progetto

```
provider-monitor/
├── src/
│   ├── index.ts           # Entry point: Express + cron setup
│   ├── config.ts          # Env vars tipizzate con validazione
│   ├── db/
│   │   └── supabase.ts    # Client Supabase inizializzato
│   ├── services/
│   │   ├── checker.ts     # Logica health check singolo provider
│   │   └── monitor.ts     # Orchestrazione: loop su tutti i provider
│   ├── routes/
│   │   └── api.ts         # Express routes
│   └── utils/
│       └── logger.ts      # Logger (console o pino)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## Output Atteso

Repository funzionante che:

1. ✅ Si avvia con `docker-compose up`
2. ✅ Esegue health check automatici ogni 5 minuti
3. ✅ Aggiorna la tabella `stream_providers` su Supabase
4. ✅ Espone API per trigger manuali
5. ✅ Logga in modo chiaro cosa sta facendo
6. ✅ Gestisce errori gracefully (non crasha mai)

---

## Istruzioni per Claude

1. Leggi questo file completamente
2. Crea `package.json` con le dipendenze necessarie
3. Crea `tsconfig.json` per TypeScript
4. Implementa i file in `src/` seguendo la struttura
5. Crea `Dockerfile` e `docker-compose.yml`
6. Crea `.env.example`
7. Crea un `README.md` con istruzioni di setup

Inizia dal setup del progetto (package.json, tsconfig), poi passa all'implementazione.
