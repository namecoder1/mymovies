import { getTVShowDetails, getImageUrl, getSeasonDetails } from '@/lib/tmdb';
import WatchListButton from '@/components/WatchListButton';
import { Star, Calendar, Play } from 'lucide-react';
import SeasonList from '@/components/SeasonList';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getWatchStatus, getEpisodeProgress } from '@/lib/actions';

export default async function TVShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const show = await getTVShowDetails(id);
  const backdrop = getImageUrl(show.backdrop_path, 'original');

  const cookieStore = await cookies();
  const profileId = cookieStore.get('profile_id')?.value;

  let watchStatus = null;
  let episodeProgress: Record<string, { progress: number; duration: number }> = {};
  let initialSeasonNumber = 1;

  if (profileId) {
    const [status, progressList] = await Promise.all([
      getWatchStatus(profileId, Number(id), 'tv'),
      getEpisodeProgress(profileId, Number(id))
    ]);
    watchStatus = status;

    if (watchStatus?.lastSeason) {
      initialSeasonNumber = watchStatus.lastSeason;
    }

    // Map progress by season_episode
    progressList.forEach((p: any) => {
      // Use explicit string conversion to match SeasonList key generation
      const key = `${p.season_number}_${p.episode_number}`;
      episodeProgress[key] = {
        progress: p.progress,
        duration: p.duration
      };
    });
  }

  // Fetch only the initial season
  const initialSeason = await getSeasonDetails(id, initialSeasonNumber);

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Heavy Hero/Header */}
      <div className="relative w-full h-[60vh] md:h-[70vh]">
        <div className="absolute inset-0">
          <img src={backdrop} alt={show.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 w-full p-4 md:p-10 z-10">
          <div className="container mx-auto">
            <h1 className="text-4xl md:text-6xl font-black mb-4 drop-shadow-lg">{show.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-zinc-300 mb-6">
              <span className="flex items-center gap-1 text-yellow-400 font-bold">
                <Star className="fill-yellow-400 w-5 h-5" /> {show.vote_average.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-5 h-5" /> {show.first_air_date.split('-')[0]}
              </span>
              <span className="px-2 py-0.5 border border-zinc-600 rounded text-xs bg-zinc-900/50">
                {show.number_of_seasons} Stagioni
              </span>
              <div className="flex gap-2">
                {show.genres.map(g => (
                  <span key={g.id} className="text-zinc-400">{g.name}</span>
                ))}
              </div>
            </div>

            <p className="max-w-3xl text-lg text-zinc-300 line-clamp-3 mb-8 drop-shadow-md">
              {show.overview}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={watchStatus?.lastSeason && watchStatus?.lastEpisode
                  ? `/tv/${id}/watch?season=${watchStatus.lastSeason}&episode=${watchStatus.lastEpisode}`
                  : `/tv/${id}/watch?season=1&episode=1`
                }
                className="flex flex-col w-full sm:w-fit items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition-transform hover:scale-105 shadow-lg shadow-red-900/20"
              >
                {watchStatus?.status === 'watching' || watchStatus?.lastSeason ? (
                  <>
                    <span>Riprendi Ep.{watchStatus.lastEpisode} S.{watchStatus.lastSeason}</span>
                  </>
                ) : (
                  "Guarda ora"
                )}
              </Link>
              <WatchListButton
                tmdbId={show.id}
                mediaType="tv"
                title={show.name}
                releaseDate={show.first_air_date}
                posterPath={show.poster_path || ""}
                voteAverage={show.vote_average}
                genres={JSON.stringify(show.genres || [])}
                totalDuration={show.episode_run_time?.[0] || 0}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <SeasonList
          showId={show.id}
          seasonsMetadata={show.seasons}
          initialSeason={initialSeason}
          watchStatus={watchStatus}
          episodeProgress={episodeProgress}
        />
      </div>
    </main >
  );
}

