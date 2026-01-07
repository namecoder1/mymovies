// I need to check VideoPlayer.tsx to see how it saves progress
// Actually, I can just update the `VideoPlayer` server component wrapper to fetch the correct initial time which I already did in previous step (but I need to update it to use `getEpisodeProgress` for granular start time).

import { getTVShowDetails } from '@/lib/tmdb';
import { getWatchStatus, getEpisodeProgress } from '@/lib/actions';
import VideoPlayer from '@/components/VideoPlayer';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';

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

  if (profileId) {
    // Get granular episode progress
    // We fetch all progress for simplicity or we could have a specific fetcher.
    // getEpisodeProgress returns array.
    const progressList = await getEpisodeProgress(profileId, Number(id));
    const episodeData = progressList.find((p: any) => p.season_number === seasonNum && p.episode_number === episodeNum);

    if (episodeData) {
      startTime = episodeData.progress;
    }
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
        totalDuration={show.episode_run_time?.[0] ? show.episode_run_time[0] * 60 : 0}
        genres={JSON.stringify(show.genres || [])}
        startTime={startTime}
        nextEpisodeUrl={nextEpisodeUrl}
      />
    </div>
  );
}