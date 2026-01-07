import { getTVShowDetails, getImageUrl, getSeasonDetails, getTVShowCredits, getSimilarTVShows } from '@/lib/tmdb';
import CategorySection from '@/components/CategorySection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WatchListButton from '@/components/WatchListButton';
import RatingContent from '@/components/Rating';
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
  const credits = await getTVShowCredits(id);
  const backdrop = getImageUrl(show.backdrop_path, 'original');
  const similarShows = await getSimilarTVShows(id);

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

  // Filter casting: top 10 actors
  const cast = credits.cast.slice(0, 10);
  const creators = show.created_by;
  const networks = show.networks;

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
            <div className='w-full sm:max-w-sm mt-6'>
              <RatingContent />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="watch" className="w-full">
          <TabsList className="w-full sm:max-w-sm">
            <TabsTrigger
              value="watch"
              className="flex-1 w-1/2 sm:flex-none px-8 py-2.5 text-base data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 transition-all font-medium"
            >
              Guarda
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="flex-1 w-1/2 sm:flex-none px-8 py-2.5 text-base data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 transition-all font-medium"
            >
              Scopri
            </TabsTrigger>
          </TabsList>

          <TabsContent value="watch" className="space-y-8 mt-4 animate-in fade-in-50 duration-300">
            <SeasonList
              showId={show.id}
              seasonsMetadata={show.seasons}
              initialSeason={initialSeason}
              watchStatus={watchStatus}
              episodeProgress={episodeProgress}
            />
          </TabsContent>

          <TabsContent value="discover" className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-4 animate-in fade-in-50 duration-300">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-12">
              <section>
                <h2 className="text-2xl font-bold mb-6 text-zinc-100 flex items-center gap-2">
                  Cast Principale
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {cast.map(actor => (
                    <div key={actor.id} className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex items-center gap-3 hover:bg-zinc-800/80 transition-colors">
                      <img
                        src={getImageUrl(actor.profile_path, 'w500')}
                        alt={actor.name}
                        className="w-12 h-12 rounded-full object-cover bg-zinc-800"
                      />
                      <div className="overflow-hidden">
                        <div className="font-semibold text-sm truncate text-zinc-200">{actor.name}</div>
                        <div className="text-xs text-zinc-400 truncate">{actor.character}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {show.production_companies && show.production_companies.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-6 text-zinc-100">Produzione</h2>
                  <div className="flex flex-wrap gap-6 items-center bg-white/5 p-6 rounded-xl border border-zinc-800">
                    {show.production_companies.map(company => (
                      <div key={company.id} className="flex flex-col items-center gap-2">
                        {company.logo_path ? (
                          <div className="h-12 w-auto bg-white/10 p-2 rounded flex items-center justify-center">
                            <img
                              src={getImageUrl(company.logo_path, 'original')}
                              alt={company.name}
                              className="h-full object-contain filter invert opacity-80"
                            />
                          </div>
                        ) : (
                          <span className="text-zinc-400 font-medium px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
                            {company.name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-8">
              <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800 sticky top-24">
                <h3 className="text-lg font-bold mb-6 text-zinc-100 border-b border-zinc-800 pb-2">Informazioni</h3>
                <div className="space-y-6 text-sm">
                  {creators && creators.length > 0 && (
                    <div>
                      <div className="text-zinc-500 mb-1.5 font-medium uppercase text-xs tracking-wider">Creato da</div>
                      <div className="flex flex-wrap gap-2">
                        {creators.map(c => (
                          <span key={c.id} className="text-zinc-200 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {networks && networks.length > 0 && (
                    <div>
                      <div className="text-zinc-500 mb-1.5 font-medium uppercase text-xs tracking-wider">Network</div>
                      <div className="flex flex-wrap gap-3">
                        {networks.map(n => (
                          <div key={n.id} className="h-6">
                            {n.logo_path ? (
                              <img
                                src={getImageUrl(n.logo_path, 'w500')}
                                alt={n.name}
                                className="h-full object-contain filter invert opacity-70"
                              />
                            ) : (
                              <span className="text-zinc-200">{n.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-zinc-500 mb-1 font-medium uppercase text-xs tracking-wider">Status</div>
                    <div className="text-zinc-200 font-medium">{show.status}</div>
                  </div>

                  <div>
                    <div className="text-zinc-500 mb-1 font-medium uppercase text-xs tracking-wider">Lingua Originale</div>
                    <div className="text-zinc-200 font-medium uppercase">{show.original_language}</div>
                  </div>

                  <div>
                    <div className="text-zinc-500 mb-1 font-medium uppercase text-xs tracking-wider">Tipo</div>
                    <div className="text-zinc-200 font-medium">{show.type}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-3 mt-8">
              <CategorySection
                title="Serie Simili"
                items={similarShows}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main >
  );
}

