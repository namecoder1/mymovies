# Provider di streaming tipo `vidsrc` e strategia di fallback

Questo documento descrive i provider di streaming tipo `vidsrc` che espongono player embedding via iframe basati su ID TMDB/IMDB, e come raggrupparli per pattern di URL in modo da implementare una catena di fallback nel codice.

## Obiettivo

Avere una lista di provider simili a `vidsrc.cc / vidsrc.me` che:

- espongono **iframe embeddabili**
- lavorano con **TMDB e/o IMDB ID**
- siano organizzati in **famiglie di pattern URL** per semplificare il fallback

L’idea è normalizzare la richiesta (tmdb/imdb + movie/tv + stagione/episodio) e poi generare la URL per ciascun provider in base alla sua famiglia.

---

## Modello concettuale

Input normalizzato:

```ts
type IdType = 'tmdb' | 'imdb';
type ContentType = 'movie' | 'tv';

interface StreamRequest {
  id: string;        // TMDB ID o IMDB ID, a seconda di idType
  idType: IdType;    // 'tmdb' | 'imdb'
  type: ContentType; // 'movie' | 'tv'
  season?: number;   // richiesto se type === 'tv'
  episode?: number;  // richiesto se type === 'tv'
}
```

Config provider:

```ts
type ProviderFamily = 'query-tmdb' | 'videoid-tmdb' | 'path-tmdb' | 'path-imdb';

interface ProviderConfig {
  key: string;            // identificatore interno (es. 'vidsrcMe')
  host: string;           // es. 'https://vidsrc.me'
  family: ProviderFamily; // pattern URL usato
  extra?: Record<string, string>; // override param names, path, ecc.
}
```

---

## Famiglie di pattern URL

### 1. Famiglia `query-tmdb`

Pattern generale:

- **Film**  
  `https://HOST/embed/movie?tmdb={tmdb_id}`  
  (o varianti `?tmdb_id=` / `?id=`)

- **Serie TV**  
  `https://HOST/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}`  
  (o con `s`/`e` al posto di `season`/`episode`)

Caratteristiche:

- Lavora **principalmente con TMDB**.
- L’informazione su stagione/episodio è in **querystring**.

Esempi tipici di provider in questa famiglia (pattern simile, cambia solo host/param names):

- `vidsrc.me` – `.../embed/movie?tmdb={id}`, `.../embed/tv?tmdb={id}&season={s}&episode={e}`
- `vidsrc.xyz` – stesso concetto, naming leggermente diverso dei parametri
- `moviesapi.club` – `.../movie?tmdb={id}` / `.../tv?tmdb={id}&season={s}&episode={e}`
- `databasegdriveplayer.co` – `player.php?type=series&tmdb={tmdb_id}&season={s}&episode={e}`
- altri cloni di `vidsrc` o wrapper che mettono il TMDB ID solo in querystring

Strategia di build (pseudo-TS):

```ts
function buildQueryTmdbUrl(p: ProviderConfig, r: StreamRequest): string | null {
  if (r.idType !== 'tmdb') return null;

  const moviePath = p.extra?.moviePath ?? '/embed/movie';
  const tvPath    = p.extra?.tvPath ?? '/embed/tv';

  const tmdbParam = p.extra?.tmdbParam ?? 'tmdb';
  const seasonParam = p.extra?.seasonParam ?? 'season';
  const episodeParam = p.extra?.episodeParam ?? 'episode';

  if (r.type === 'movie') {
    const url = new URL(p.host + moviePath);
    url.searchParams.set(tmdbParam, r.id);
    return url.toString();
  }

  if (r.type === 'tv' && r.season != null && r.episode != null) {
    const url = new URL(p.host + tvPath);
    url.searchParams.set(tmdbParam, r.id);
    url.searchParams.set(seasonParam, String(r.season));
    url.searchParams.set(episodeParam, String(r.episode));
    return url.toString();
  }

  return null;
}
```

---

### 2. Famiglia `videoid-tmdb` (tipo SuperEmbed)

Pattern generale:

- **Film**  
  `https://HOST/?video_id={id}&tmdb=1`

- **Serie TV**  
  `https://HOST/?video_id={id}&tmdb=1&s={season}&e={episode}`

Caratteristiche:

- Usa un unico parametro `video_id`.
- Se l’ID è TMDB, si aggiunge `&tmdb=1`.
- Per le serie, stagione/episodio sono in querystring (`s` / `e`).

Esempi di provider:

- `SuperEmbed` – es. `se_player.php?video_id={id}&tmdb=1[&s=..&e=..]`
- `getsuperembed.link` – `?video_id={tmdbId}&tmdb=1&s={season}&e={episode}`
- altri cloni che espongono un player unico con `video_id` + flag `tmdb`

Strategia di build:

```ts
function buildVideoIdTmdbUrl(p: ProviderConfig, r: StreamRequest): string | null {
  const videoParam = p.extra?.videoParam ?? 'video_id';
  const tmdbFlagParam = p.extra?.tmdbFlagParam ?? 'tmdb';
  const tmdbFlagValue = p.extra?.tmdbFlagValue ?? '1';

  const seasonParam = p.extra?.seasonParam ?? 's';
  const episodeParam = p.extra?.episodeParam ?? 'e';

  const url = new URL(p.host);

  url.searchParams.set(videoParam, r.id);

  if (r.idType === 'tmdb') {
    url.searchParams.set(tmdbFlagParam, tmdbFlagValue);
  }

  if (r.type === 'tv' && r.season != null && r.episode != null) {
    url.searchParams.set(seasonParam, String(r.season));
    url.searchParams.set(episodeParam, String(r.episode));
  }

  return url.toString();
}
```

---

### 3. Famiglia `path-tmdb` (REST-like su path)

Pattern generale:

- **Film**  
  `https://HOST/movie/{tmdb_id}`  
  oppure `https://HOST/embed/movie/{tmdb_id}`

- **Serie TV**  
  `https://HOST/tv/{tmdb_id}/{season}/{episode}`  
  oppure `https://HOST/embed/tv/{tmdb_id}/{season}/{episode}`

Caratteristiche:

- L’ID TMDB è nel **path**, non in querystring.
- La stagione/episodio vengono spesso codificati nel path.

Esempi di provider:

- `embed.su` – `.../embed/movie/{tmdb_id}`, `.../embed/tv/{tmdb_id}/{season}/{episode}`
- `curtstream.com` – `.../series/tmdb/{tmdbId}/{season}/{episode}`
- wrapper self-host tipo `TMDB-Embed-API` con endpoint tipo `/movie/{TMDBID}` / `/tv/{TMDBID}?s=&e=`

Strategia di build:

```ts
function buildPathTmdbUrl(p: ProviderConfig, r: StreamRequest): string | null {
  if (r.idType !== 'tmdb') return null;

  const movieTemplate = p.extra?.movieTemplate ?? '/movie/{id}';
  const tvTemplate = p.extra?.tvTemplate ?? '/tv/{id}/{season}/{episode}';

  if (r.type === 'movie') {
    const path = movieTemplate.replace('{id}', r.id);
    return p.host + path;
  }

  if (r.type === 'tv' && r.season != null && r.episode != null) {
    const path = tvTemplate
      .replace('{id}', r.id)
      .replace('{season}', String(r.season))
      .replace('{episode}', String(r.episode));
    return p.host + path;
  }

  return null;
}
```

---

### 4. Famiglia `path-imdb` (IMDB-only stile 2Embed)

Pattern generale:

- **Film**  
  `https://HOST/embed/movie/{imdb_id}`  
  oppure `https://HOST/movie/{imdb_id}`

- **Serie TV**  
  `https://HOST/embed/tv/{imdb_id}/{season}/{episode}`

Caratteristiche:

- Lavora **solo con IMDB ID**.
- L’ID è nel path, con eventuale suffisso per stagione/episodio.

Esempi di provider:

- `2embed` (vari domini `.cc`, `.stream`, etc.) –
  - `.../embed/movie/{imdb_id}`
  - `.../embed/tv/{imdb_id}/{season}/{episode}`
- altri cloni IMDB-only con path simile

Strategia di build:

```ts
function buildPathImdbUrl(p: ProviderConfig, r: StreamRequest): string | null {
  if (r.idType !== 'imdb') return null;

  const movieTemplate = p.extra?.movieTemplate ?? '/embed/movie/{id}';
  const tvTemplate = p.extra?.tvTemplate ?? '/embed/tv/{id}/{season}/{episode}';

  if (r.type === 'movie') {
    const path = movieTemplate.replace('{id}', r.id);
    return p.host + path;
  }

  if (r.type === 'tv' && r.season != null && r.episode != null) {
    const path = tvTemplate
      .replace('{id}', r.id)
      .replace('{season}', String(r.season))
      .replace('{episode}', String(r.episode));
    return p.host + path;
  }

  return null;
}
```

---

## Esempio di registry provider

```ts
const PROVIDERS: ProviderConfig[] = [
  // Famiglia query-tmdb
  { key: 'vidsrcMe', host: 'https://vidsrc.me', family: 'query-tmdb' },
  { key: 'vidsrcXyz', host: 'https://vidsrc.xyz', family: 'query-tmdb' },
  { key: 'moviesApiClub', host: 'https://moviesapi.club', family: 'query-tmdb' },

  // Famiglia videoid-tmdb
  { key: 'superembed', host: 'https://superembed.example/se_player.php', family: 'videoid-tmdb' },
  { key: 'getSuperembed', host: 'https://getsuperembed.link', family: 'videoid-tmdb' },

  // Famiglia path-tmdb
  { key: 'embedSu', host: 'https://embed.su', family: 'path-tmdb' },
  { key: 'curtstream', host: 'https://curtstream.com', family: 'path-tmdb', extra: {
    movieTemplate: '/movie/tmdb/{id}',
    tvTemplate: '/series/tmdb/{id}/{season}/{episode}',
  } },

  // Famiglia path-imdb
  { key: 'twoEmbed', host: 'https://www.2embed.cc', family: 'path-imdb' },
];
```

---

## Funzione `buildUrl` unica

```ts
function buildUrl(provider: ProviderConfig, req: StreamRequest): string | null {
  switch (provider.family) {
    case 'query-tmdb':
      return buildQueryTmdbUrl(provider, req);
    case 'videoid-tmdb':
      return buildVideoIdTmdbUrl(provider, req);
    case 'path-tmdb':
      return buildPathTmdbUrl(provider, req);
    case 'path-imdb':
      return buildPathImdbUrl(provider, req);
    default:
      return null;
  }
}
```

---

## Catena di fallback

Idea: per ogni combinazione `(idType, type)` definire una **ordered list** di provider.

```ts
const FALLBACK_CHAINS = {
  movie_tmdb: ['vidsrcMe', 'vidsrcXyz', 'moviesApiClub', 'superembed', 'embedSu'],
  tv_tmdb:    ['vidsrcMe', 'vidsrcXyz', 'moviesApiClub', 'superembed', 'embedSu'],
  movie_imdb: ['twoEmbed'],
  tv_imdb:    ['twoEmbed'],
};

function getChainKey(req: StreamRequest): keyof typeof FALLBACK_CHAINS {
  return `${req.type}_${req.idType}` as const;
}

function buildFallbackUrls(req: StreamRequest): string[] {
  const key = getChainKey(req);
  const providerKeys = FALLBACK_CHAINS[key] ?? [];

  const urls: string[] = [];

  for (const pk of providerKeys) {
    const p = PROVIDERS.find(p => p.key === pk);
    if (!p) continue;

    const url = buildUrl(p, req);
    if (url) urls.push(url);
  }

  return urls;
}
```

Uso tipico lato frontend:

- prendi `buildFallbackUrls(req)`
- provi la **prima URL** nella catena nell’`iframe`.
- se fallisce (onerror, timeout, HTTP 4xx/5xx intercettato lato backend), passi alla successiva.

### Esempio di URL generate

```ts
const reqMovie: StreamRequest = {
  id: '786892',
  idType: 'tmdb',
  type: 'movie',
};

const urls = buildFallbackUrls(reqMovie);

// Possibili risultati (dipende dalla config):
// 1) https://vidsrc.me/embed/movie?tmdb=786892
// 2) https://vidsrc.xyz/embed/movie?tmdb=786892
// 3) https://moviesapi.club/embed/movie?tmdb=786892
// 4) https://superembed.example/se_player.php?video_id=786892&tmdb=1
// 5) https://embed.su/embed/movie/786892
```

---

## Note operative

- I domini dei provider cambiano spesso (DMCA, mirror, ecc.), quindi **la parte importante è il pattern**, non l’host specifico.
- Conviene mantenere i provider in un file di configurazione (o nel DB) per ruotarli e aggiornarli senza toccare il core logic.
- Puoi aggiungere metriche (success rate, response time) e fare **ordinamento dinamico** della catena in base alle performance.
- Alcuni provider lavorano solo con TMDB, altri solo con IMDB: il builder restituisce `null` se l’`idType` non è supportato, così il fallback salta automaticamente quel provider.

Questo file può essere usato come documentazione di riferimento nella repo (es. `docs/stream-providers.md`) per descrivere come funziona il sistema di fallback e quali famiglie di provider sono supportate.