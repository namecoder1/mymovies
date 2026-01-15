/**
 * Dynamic Stream Provider System
 * 
 * This module provides URL building functionality for streaming providers
 * loaded dynamically from the Supabase stream_providers table.
 */

import { getActiveHealthyProviders, StreamProvider } from './actions';

export type ContentType = 'movie' | 'tv';

export interface StreamRequest {
  id: string;        // TMDB ID (or IMDB ID for imdb-based providers)
  type: ContentType;
  season?: number;   // required if type === 'tv'
  episode?: number;  // required if type === 'tv'
}

export interface ProviderUrl {
  key: string;
  name: string;
  url: string;
  supportsResume: boolean;
  resumeParam: string | null;
}

/**
 * Build URL for a specific provider based on its family type and templates
 */
function buildProviderUrl(
  provider: StreamProvider,
  req: StreamRequest,
  startTime?: number
): string | null {
  const { family, host, movie_path_template, tv_path_template, extra_params } = provider;

  let url: string | null = null;

  switch (family) {
    case 'path-tmdb':
    case 'path-imdb': {
      // Path-based: use templates like /movie/{id} or /tv/{id}/{season}/{episode}
      if (req.type === 'movie') {
        const template = movie_path_template || '/movie/{id}';
        const path = template.replace('{id}', req.id);
        url = host + path;
      } else if (req.type === 'tv' && req.season != null && req.episode != null) {
        const template = tv_path_template || '/tv/{id}/{season}/{episode}';
        const path = template
          .replace('{id}', req.id)
          .replace('{season}', String(req.season))
          .replace('{episode}', String(req.episode));
        url = host + path;
      }
      break;
    }

    case 'query-tmdb': {
      // Query-based: uses ?tmdb=ID&season=X&episode=Y
      const moviePath = movie_path_template || '/embed/movie';
      const tvPath = tv_path_template || '/embed/tv';

      if (req.type === 'movie') {
        const urlObj = new URL(host + moviePath);
        urlObj.searchParams.set('tmdb', req.id);
        url = urlObj.toString();
      } else if (req.type === 'tv' && req.season != null && req.episode != null) {
        const urlObj = new URL(host + tvPath);
        urlObj.searchParams.set('tmdb', req.id);
        urlObj.searchParams.set('season', String(req.season));
        urlObj.searchParams.set('episode', String(req.episode));
        url = urlObj.toString();
      }
      break;
    }

    case 'videoid-tmdb': {
      // Video ID based: uses ?video_id=ID&tmdb=1&s=X&e=Y
      const urlObj = new URL(host);
      urlObj.searchParams.set('video_id', req.id);
      urlObj.searchParams.set('tmdb', '1');

      if (req.type === 'tv' && req.season != null && req.episode != null) {
        urlObj.searchParams.set('s', String(req.season));
        urlObj.searchParams.set('e', String(req.episode));
      }
      url = urlObj.toString();
      break;
    }

    default:
      console.warn(`Unknown provider family: ${family}`);
      return null;
  }

  if (!url) return null;

  // Add extra_params if present
  if (extra_params && typeof extra_params === 'object') {
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(extra_params)) {
      urlObj.searchParams.set(key, value);
    }
    url = urlObj.toString();
  }

  // Add resume parameter if provider supports it and we have a startTime
  if (startTime && startTime > 0 && provider.supports_resume && provider.resume_param) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}${provider.resume_param}=${Math.floor(startTime)}`;
  }

  return url;
}

/**
 * Get dynamic provider URLs from Supabase
 * 
 * Returns an ordered list of providers with their pre-built URLs.
 * Providers are sorted by:
 * 1. supports_resume DESC (resume-enabled first)
 * 2. priority ASC (lower = higher preference)
 * 
 * Only active and healthy providers are returned.
 */
export async function getDynamicProviders(
  req: StreamRequest,
  startTime?: number
): Promise<ProviderUrl[]> {
  const providers = await getActiveHealthyProviders(req.type);

  const results: ProviderUrl[] = [];

  for (const provider of providers) {
    const url = buildProviderUrl(provider, req, startTime);
    if (url) {
      results.push({
        key: provider.key,
        name: provider.name,
        url,
        supportsResume: provider.supports_resume,
        resumeParam: provider.resume_param,
      });
    }
  }

  return results;
}

/**
 * @deprecated Use getDynamicProviders instead
 * Kept for backwards compatibility during migration
 */
export function buildFallbackUrls(req: StreamRequest): { key: string, url: string }[] {
  console.warn('[stream-providers] buildFallbackUrls is deprecated. Use getDynamicProviders instead.');
  // Return empty - VideoPlayer should be updated to use getDynamicProviders
  return [];
}
