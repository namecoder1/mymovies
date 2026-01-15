// I need to check VideoPlayer.tsx to see how it saves progress
// Actually, I can just update the `VideoPlayer` server component wrapper to fetch the correct initial time which I already did in previous step (but I need to update it to use `getEpisodeProgress` for granular start time).

import { getTVShowDetails, getSeasonDetails } from '@/lib/tmdb';
import { getWatchStatus, getEpisodeProgress } from '@/lib/actions';
import VideoPlayer from '@/components/VideoPlayer';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string; episode?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { season, episode } = await searchParams;
  const show = await getTVShowDetails(id);

  const seasonNum = season ? parseInt(season) : 1;
  const episodeNum = episode ? parseInt(episode) : 1;

  return {
    title: `Guarda ${show.name} S${seasonNum}:E${episodeNum} | Famflix`,
    description: `Guarda ${show.name} Stagione ${seasonNum} Episodio ${episodeNum} su Famflix`,
  };
}

export default async function WatchEpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string; episode?: string }>;
}) {
  const { id } = await params;
  const { season, episode } = await searchParams;

  // Default to S1 E1 if not specified
  const seasonNum = season ? parseInt(season) : 1;
  const episodeNum = episode ? parseInt(episode) : 1;

  // Verify show exists (optional, but good for title)
  const show = await getTVShowDetails(id);

  const cookieStore = await cookies();
  const profileId = cookieStore.get('profile_id')?.value;
  let startTime = 0;

  // Fetch episode progress for the current profile
  let episodeProgressMap = new Map<string, { progress: number; duration: number }>();
  if (profileId) {
    // Get granular episode progress
    // We fetch all progress for simplicity or we could have a specific fetcher.
    // getEpisodeProgress returns array.
    const progressList = await getEpisodeProgress(profileId, Number(id));
    const episodeData = progressList.find((p: any) => p.season_number === seasonNum && p.episode_number === episodeNum);

    if (episodeData) {
      startTime = episodeData.progress;
    }

    // Build progress map for all episodes
    progressList.forEach((p: any) => {
      const key = `${p.season_number}-${p.episode_number}`;
      episodeProgressMap.set(key, {
        progress: p.progress,
        duration: p.duration || 0,
      });
    });
  }

  // Calculate next episode URL
  let nextEpisodeUrl: string | null = null;
  const currentSeason = show.seasons.find((s) => s.season_number === seasonNum);

  if (currentSeason) {
    if (episodeNum < currentSeason.episode_count) {
      // Next episode in same season
      nextEpisodeUrl = `/tv/${id}/watch?season=${seasonNum}&episode=${episodeNum + 1}`;
    } else {
      // Check for next season
      const nextSeason = show.seasons.find((s) => s.season_number === seasonNum + 1);
      if (nextSeason) {
        nextEpisodeUrl = `/tv/${id}/watch?season=${seasonNum + 1}&episode=1`;
      }
    }
  }

  // Fetch all season details for the episode selector
  const seasonsWithEpisodes = await Promise.all(
    show.seasons
      .filter((s) => s.season_number > 0) // Skip "Season 0" (specials)
      .map(async (s) => {
        const seasonDetails = await getSeasonDetails(id, s.season_number);
        return {
          season_number: s.season_number,
          name: s.name,
          episodes: seasonDetails.episodes.map((ep) => {
            const progressKey = `${s.season_number}-${ep.episode_number}`;
            const progressData = episodeProgressMap.get(progressKey);
            return {
              episode_number: ep.episode_number,
              name: ep.name,
              still_path: ep.still_path,
              overview: ep.overview,
              runtime: ep.runtime,
              progress: progressData?.progress,
              duration: progressData?.duration,
            };
          }),
        };
      })
  );

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-50">
      <Link
        href={`/tv/${id}`}
        className="absolute top-4 left-4 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </Link>

      <VideoPlayer
        tmdbId={Number(id)}
        season={seasonNum}
        episode={episodeNum}
        mediaType="tv"
        title={show.name}
        posterPath={show.poster_path || ''}
        totalDuration={
          (seasonsWithEpisodes
            .find(s => s.season_number === seasonNum)
            ?.episodes.find(e => e.episode_number === episodeNum)?.runtime) || 0
        }
        genres={JSON.stringify(show.genres || [])}
        startTime={startTime}
        nextEpisodeUrl={nextEpisodeUrl}
        seasons={seasonsWithEpisodes}
      />
    </div>
  );
}