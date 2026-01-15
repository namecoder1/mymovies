'use client';

import { useEffect, useRef, useState } from 'react';
import { incrementProgress, updateEpisodeProgress, checkUrlAvailability } from '@/lib/actions';
import { useProfile } from './ProfileProvider';
import EpisodeSelector from './EpisodeSelector';
import { getDynamicProviders, StreamRequest, ProviderUrl } from '@/lib/stream-providers';

interface Episode {
  episode_number: number;
  name: string;
  still_path: string | null;
  overview: string;
  runtime: number;
}

interface Season {
  season_number: number;
  name: string;
  episodes: Episode[];
}

interface VideoPlayerProps {
  tmdbId: number;
  season?: number;
  episode?: number;
  mediaType: 'movie' | 'tv';
  startTime: number;
  title: string;
  posterPath: string;
  totalDuration?: number;
  genres?: string; // JSON string
  nextEpisodeUrl?: string | null;
  seasons?: Season[];
}

export default function VideoPlayer({
  tmdbId,
  season,
  episode,
  mediaType,
  startTime,
  title,
  posterPath,
  totalDuration,
  genres,
  nextEpisodeUrl,
  seasons = [],
}: VideoPlayerProps) {
  const { currentProfile } = useProfile();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback State
  const [iframeSrc, setIframeSrc] = useState<string>('');
  const [currentProviderKey, setCurrentProviderKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [errorCount, setErrorCount] = useState(0); // Tracks loading retries for current source
  const [errorType, setErrorType] = useState<'timeout' | 'load' | 'unknown'>('unknown');

  // Progress State
  const [currentProgress, setCurrentProgress] = useState(startTime);
  const formattedDuration = (totalDuration || 0) * 60; // Convert to seconds for internal logic if it's minutes
  const [localDuration, setLocalDuration] = useState(formattedDuration);

  const [showNextButton, setShowNextButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Default to false, wait for interaction
  const [isHovering, setIsHovering] = useState(false);
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);


  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(startTime); // In seconds

  /* Ref to keep track of localDuration inside the message listener (which has empty deps) */
  const localDurationRef = useRef(formattedDuration);

  useEffect(() => {
    localDurationRef.current = localDuration;
  }, [localDuration]);

  // Ref to hold latest state/props for periodic updates to avoid resetting the interval
  const latestDataRef = useRef({
    isPlaying,
    currentProfile,
    mediaType,
    season,
    episode,
    title,
    posterPath,
    genres
  });

  const hasSeekedRef = useRef(false);

  useEffect(() => {
    latestDataRef.current = {
      isPlaying,
      currentProfile,
      mediaType,
      season,
      episode,
      title,
      posterPath,
      genres
    };
  }, [isPlaying, currentProfile, mediaType, season, episode, title, posterPath, genres]);

  // Fallback Logic
  const triedProvidersRef = useRef<Set<string>>(new Set());
  const providersRef = useRef<ProviderUrl[]>([]); // Cache providers list
  const currentProviderKeyRef = useRef<string>(''); // Sync state for event listeners

  useEffect(() => {
    let aborted = false;

    const initializePlayer = async () => {
      setIsLoading(true);
      setIframeError(false);
      setErrorCount(0);
      triedProvidersRef.current.clear();
      hasSeekedRef.current = false;

      // Fetch providers once on content change
      const req: StreamRequest = {
        id: String(tmdbId),
        type: mediaType,
        season,
        episode
      };

      console.log('[VideoPlayer] Fetching dynamic providers for', req);
      const fetchedProviders = await getDynamicProviders(req, startTime);

      if (aborted) return;

      providersRef.current = fetchedProviders;
      console.log('[VideoPlayer] Got providers:', providersRef.current.map(p => p.key));

      await loadNextProvider();
    };

    initializePlayer();

    return () => {
      aborted = true;
    };
  }, [tmdbId, season, episode, mediaType, startTime]); // Reset on content change

  const loadNextProvider = async () => {
    setIsLoading(true);
    setIframeError(false);

    const fallbackOptions = providersRef.current;

    // Find first provider we haven't tried yet
    let nextOption = fallbackOptions.find(opt => !triedProvidersRef.current.has(opt.key));

    if (!nextOption) {
      console.error('[VideoPlayer] All providers failed.');
      setIframeError(true);
      setErrorType('load');
      setIsLoading(false);
      return;
    }

    // Try this provider
    triedProvidersRef.current.add(nextOption.key);
    console.log(`[VideoPlayer] Trying provider: ${nextOption.key} (${nextOption.name})`);
    console.log(`[VideoPlayer] URL: ${nextOption.url}`);
    console.log(`[VideoPlayer] Supports resume: ${nextOption.supportsResume}, param: ${nextOption.resumeParam}`);

    // Check availability (optional, acts as pre-flight)
    const available = await checkUrlAvailability(nextOption.url);
    if (!available) {
      console.warn(`[VideoPlayer] Provider ${nextOption.key} returned 404 (HEAD check). Skipping...`);
      loadNextProvider();
      return;
    }

    // URL already includes resume parameter if provider supports it
    // (handled by getDynamicProviders)
    setIframeSrc(nextOption.url);
    setCurrentProviderKey(nextOption.key);
    currentProviderKeyRef.current = nextOption.key;
    setIsLoading(false);
    setIsPlaying(false);

    // Reset seek flag for new provider
    hasSeekedRef.current = false;
  };

  const handleIframeError = () => {
    console.error(`Provider ${currentProviderKey} failed to load (iframe onError). Switching...`);
    loadNextProvider();
  };

  const handleManualSwitch = async () => {
    if (isSwitchingSource) return;
    setIsSwitchingSource(true);
    // Add current to tried so we skip it
    if (currentProviderKey) {
      triedProvidersRef.current.add(currentProviderKey);
    }

    // Slight delay to show feedback
    setTimeout(async () => {
      await loadNextProvider();
      setIsSwitchingSource(false);
    }, 500);
  };

  // Timer-based Progress Tracker
  useEffect(() => {
    if (!currentProfile) return;
    if (isLoading) return;

    // Reset refs on new content load
    progressRef.current = startTime;
    setCurrentProgress(startTime);

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    // If localDuration is 0, we'll try to rely on incoming totalDuration if it updates late
    const d = localDuration > 0 ? localDuration : (totalDuration || 0) * 60;
    if (d !== localDuration) setLocalDuration(d);

    progressTimerRef.current = setInterval(() => {
      // Only increment if global isPlaying is true
      if (document.visibilityState === 'visible' && isPlaying) {
        // Increment
        progressRef.current += 1;

        // Cap at duration if known (and if duration isn't 0)
        // If duration is 0, we keep counting (maybe live or unknown length)
        if (localDuration > 0 && progressRef.current > localDuration) {
          progressRef.current = localDuration;
        }

        setCurrentProgress(progressRef.current);

        // Check for "Next Episode" button (90% completion)
        if (localDuration > 0) {
          const percentage = (progressRef.current / localDuration) * 100;

          if (percentage >= 90) {
            if (!showNextButton) console.log('[VideoPlayer] Showing Next Episode Button!');
            setShowNextButton(true);
          } else {
            setShowNextButton(false);
          }
        }
      }
    }, 1000);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentProfile, isLoading, startTime, localDuration, isPlaying, totalDuration]);


  // Periodic DB Save (Every minute)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const {
        isPlaying,
        currentProfile,
        mediaType,
        season,
        episode,
        title,
        posterPath,
        genres
      } = latestDataRef.current;

      const currentProgressVal = Math.round(progressRef.current);
      const currentDurationVal = Math.round(localDurationRef.current);

      console.log('[VideoPlayer] DB Save Interval Tick', {
        visibility: document.visibilityState,
        isPlaying,
        currentProgressVal,
        currentDurationVal,
        isValidProfile: !!currentProfile,
        tmdbId,
        mediaType
      });

      if (document.visibilityState === 'visible' && isPlaying && currentProgressVal > 0 && currentProfile) {

        console.log('[VideoPlayer] Saving to DB now...', {
          mediaType,
          tmdbId,
          progress: currentProgressVal,
          duration: currentDurationVal,
          table: mediaType === 'tv' ? 'episode_progress' : 'movie_progress'
        });

        if (mediaType === 'tv' && season && episode) {
          updateEpisodeProgress(
            currentProfile.id,
            tmdbId,
            season,
            episode,
            currentProgressVal,
            currentDurationVal,
            {
              mediaType,
              title,
              posterPath,
              totalDuration: currentDurationVal,
              genres
            }
          );
        } else {
          import('@/lib/actions').then(({ updateMovieProgress }) => {
            updateMovieProgress(
              currentProfile.id,
              tmdbId,
              currentProgressVal,
              currentDurationVal,
              {
                title,
                posterPath,
                totalDuration: currentDurationVal,
                genres
              }
            );
          });
        }
      }
    }, 60000); // 1 minute

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tmdbId, mediaType, season, episode]); // Only reset on content change


  // Listen for generic messages and user interaction
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      let msg = event.data;

      // 1. Try to parse if string
      if (typeof msg === 'string') {
        try {
          // If it starts with {, it might be JSON
          if (msg.trim().startsWith('{')) {
            msg = JSON.parse(msg);
          }
        } catch (e) {
          // not JSON, keep as string
        }
      }

      // Filter react devtools
      if (typeof msg === 'object' && msg?.source?.includes?.('react-devtools')) return;

      let type = '';

      // 2. Determine Type
      if (typeof msg === 'string') type = msg;
      else if (msg.event) type = msg.event;
      else if (msg.type) type = msg.type;

      // Special handling for PLAYER_EVENT structure seen in logs
      // Structure: { type: "PLAYER_EVENT", data: { event: "timeupdate", data: { currentTime: ..., duration: ... } } }
      if (type === 'PLAYER_EVENT' && msg.data) {
        if (msg.data.event) type = msg.data.event;
        else if (msg.data.type) type = msg.data.type;
      }

      // --- SEEK FALLBACK LOGIC ---
      // If we haven't seeked yet (and we have a start time), try to force seeking via postMessage
      // as soon as we get ANY message from the iframe (implies it's ready/active).
      // --- SEEK FALLBACK LOGIC ---
      // If we haven't seeked yet (and we have a start time), try to force seeking via postMessage
      // as soon as we get ANY message from the iframe (implies it's ready/active).
      // Skip if provider supports resume via URL param (handled in validUrl)
      // Use ref to avoid stale closure state in event listener
      const currentKey = currentProviderKeyRef.current;
      const currentProvider = providersRef.current.find(p => p.key === currentKey);
      const shouldSkipSeek = currentProvider?.supportsResume;

      if (startTime > 0 && !hasSeekedRef.current && iframeRef.current?.contentWindow && !shouldSkipSeek) {
        hasSeekedRef.current = true; // Mark as handled
        console.log(`[VideoPlayer] Triggering seek sequence to ${startTime}s for ${currentKey}`);

        const win = iframeRef.current.contentWindow;

        const sendSeek = () => {
          console.log('[VideoPlayer] Sending seek commands...');
          // 1. YouTube / Google style
          win.postMessage(JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [startTime, true]
          }), "*");

          // 2. Generic "seek" type
          win.postMessage(JSON.stringify({
            type: "seek",
            time: startTime
          }), "*");

          // 3. Simple "seek" event
          win.postMessage(JSON.stringify({
            event: "seek",
            time: startTime
          }), "*");

          // 4. Clappr / Other style
          win.postMessage(JSON.stringify({
            action: "seek",
            value: startTime
          }), "*");

          // 5. Mimic incoming structure (reverse)
          win.postMessage(JSON.stringify({
            type: "PLAYER_COMMAND",
            data: {
              event: "seek",
              time: startTime
            }
          }), "*");
        };

        // "Shotgun" approach: try immediately, then after short delays to ensure player is ready
        sendSeek();
        setTimeout(sendSeek, 1000);
        setTimeout(sendSeek, 3000);
        setTimeout(sendSeek, 5000);
      }
      // ---------------------------

      // Console log verbose only if needed, now we trust the logic
      // console.log('[VideoPlayer] Processed Message Type:', type);

      if (type === 'pause') {
        setIsPlaying(false);
      }

      if (type === 'play' || type === 'playing') {
        setIsPlaying(true);
      }

      // Handle time updates
      if (type === 'time' || type === 'timeupdate') {
        let t = -1;
        let d = -1;

        // Helper to safely find property in msg or msg.data or msg.data.data
        const findProp = (obj: any, keys: string[]) => {
          if (!obj) return undefined;
          for (const k of keys) {
            if (typeof obj[k] === 'number') return obj[k];
          }
          return undefined;
        };

        const possibleSources = [
          msg,
          msg.data,
          msg.data?.data
        ];

        for (const src of possibleSources) {
          if (!src) continue;

          if (t === -1) {
            const foundT = findProp(src, ['time', 'currentTime', 'position']);
            if (foundT !== undefined) t = foundT;
          }

          if (d === -1) {
            const foundD = findProp(src, ['duration', 'totalTime', 'totalDuration']);
            if (foundD !== undefined) d = foundD;
          }
        }

        if (t >= 0) {
          // Update local progress
          // Note: The timer loop also increments progress, but this syncs it to truth
          if (Math.abs(t - progressRef.current) > 1) {
            progressRef.current = t;
            setCurrentProgress(t);
          }
          // If we are getting time updates, we are definitely playing
          setIsPlaying(true);
        }

        if (d > 0 && Math.abs(d - localDurationRef.current) > 1) {
          setLocalDuration(d);
        }
      }
    };

    // Heuristic: If window blurs (focus goes to iframe), assume user clicked play
    const handleBlur = () => {
      if (document.activeElement === iframeRef.current) {
        setIsPlaying(true);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full bg-black"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          {posterPath && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${posterPath})` }}
              />
              <img
                src={`https://image.tmdb.org/t/p/w500${posterPath}`}
                alt={title}
                className="relative z-10 w-48 rounded-lg shadow-2xl animate-pulse"
              />
            </>
          )}
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        </div>
      ) : iframeError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white gap-6 p-8 z-50">
          <p className="text-xl">Impossibile caricare il video da nessuna sorgente.</p>
          <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-2 rounded font-bold">Ricarica Pagina</button>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-none"
          title={title}
          allowFullScreen
          referrerPolicy="origin"
          allow="autoplay; encrypted-media"
          onError={handleIframeError}
        />
      )}

      {/* Episode Selector - only for TV shows */}
      {mediaType === 'tv' && season && episode && (
        <EpisodeSelector
          tmdbId={tmdbId}
          currentSeason={season}
          currentEpisode={episode}
          seasons={seasons}
          isVisible={isHovering}
        />
      )}

      {/* Manual Switch Server Button */}
      {/* Manual Switch Server Button - Fail-safe visibility */}
      {isHovering && (
        <div className="fixed top-16 right-6 z-50 flex flex-col gap-2">
          <button
            onClick={handleManualSwitch}
            className="bg-red-600 text-white px-3 py-2 rounded-lg shadow-2xl hover:bg-red-700 transition-all font-bold text-base flex items-center gap-2 ring-2 ring-black/50"
            title="Cambia Server"
          >
            {isSwitchingSource ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className='text-xs'>Cambio...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span className='text-xs'>CAMBIA SERVER</span>
              </>
            )}
          </button>
        </div>
      )}


      {/* Next Episode Button */}
      {showNextButton && nextEpisodeUrl && mediaType === 'tv' && (
        <a
          href={nextEpisodeUrl}
          className="absolute bottom-24 right-8 z-60 bg-white text-black px-6 py-3 rounded-lg font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
        >
          <span>Prossimo Episodio</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </a>
      )}
    </div>
  );
}
