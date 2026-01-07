import WatchListButton from '@/components/WatchListButton';
import { getMovieDetails, getImageUrl, getMovieCredits, getSimilarMovies, getCollectionDetails } from '@/lib/tmdb';
import CategorySection from '@/components/CategorySection';
import { Star, Clock, Calendar, Play } from 'lucide-react';
import Link from 'next/link';
import MovieStatusChecker from '@/components/MovieStatusChecker';
import { cookies } from 'next/headers';
import { getWatchStatus, getMovieProgress } from '@/lib/actions';
import { Progress } from '@/components/ui/progress';
import RatingContent from '@/components/Rating';


export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovieDetails(id);
  const credits = await getMovieCredits(id);
  const backdrop = getImageUrl(movie.backdrop_path, 'original');
  const poster = getImageUrl(movie.poster_path, 'w500');

  const similarMovies = await getSimilarMovies(id);
  const collection = movie.belongs_to_collection ? await getCollectionDetails(movie.belongs_to_collection.id) : null;


  const cookieStore = await cookies();
  const profileId = cookieStore.get('profile_id')?.value;
  let watchStatus = null;
  let movieProgress = null; // New debug variable

  if (profileId) {
    watchStatus = await getWatchStatus(profileId, Number(id), 'movie');
    movieProgress = await getMovieProgress(profileId, Number(id));
  }

  // Filter casting: top 10 actors
  const cast = credits.cast.slice(0, 10);
  const director = credits.crew.find(c => c.job === 'Director');
  const writers = credits.crew.filter(c => c.department === 'Writing').slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Hero Section */}
      <div className="relative h-[70vh] w-full">
        <div className="absolute inset-0">
          <img
            src={backdrop}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>
        <div className="container mx-auto px-4 h-full flex items-end pb-10 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            <img
              src={poster}
              alt={movie.title}
              className="hidden md:block w-64 rounded-xl shadow-2xl border border-zinc-800"
            />
            <div className="max-w-3xl mb-4">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">{movie.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-zinc-300 mb-6">
                <span className="flex items-center gap-2 text-yellow-400 font-bold">
                  <Star className="fill-yellow-400 w-5 h-5" /> {movie.vote_average.toFixed(1)}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5" /> {movie.runtime} min
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> {movie.release_date.split('-')[0]}
                </span>
                <div className="flex gap-2">
                  {movie.genres.map((g) => (
                    <span key={g.id} className="px-3 py-1 bg-zinc-800/80 rounded-full text-xs border border-zinc-700 backdrop-blur-sm">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>

              {watchStatus?.status === 'watching' && (
                <>
                  <span className="text-xs font-medium opacity-90 uppercase tracking-widest">Progresso nel film: {(Math.round((watchStatus.progress || 0) / 60) / movie.runtime * 100).toFixed(2)}%</span>
                  <Progress value={Number((Math.round((watchStatus.progress || 0) / 60) / movie.runtime * 100).toFixed(2))} className="w-full max-w-sm mb-4 mt-2" />
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={`/movies/${id}/watch`}
                  className="flex flex-col w-full sm:w-fit text-center items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition-transform hover:scale-105 shadow-lg shadow-red-900/20"
                >
                  {watchStatus?.status === 'watching' ? (
                    <span>Riprendi</span>
                  ) : (
                    <p className='w-full text-nowrap'>
                      Guarda Ora
                    </p>
                  )}
                </Link>
                <WatchListButton
                  tmdbId={movie.id}
                  mediaType="movie"
                  title={movie.title}
                  releaseDate={movie.release_date}
                  posterPath={movie.poster_path || ""}
                  voteAverage={movie.vote_average}
                  genres={JSON.stringify(movie.genres || [])}
                  totalDuration={movie.runtime}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-12">


          <div>
            <RatingContent
              tmdbId={movie.id}
              mediaType="movie"
              profileId={profileId}
              initialValue={watchStatus?.vote ? parseInt(watchStatus.vote) : 0}
              metadata={{
                title: movie.title,
                posterPath: movie.poster_path || "",
                releaseDate: movie.release_date,
                genres: JSON.stringify(movie.genres),
                totalDuration: movie.runtime
              }}
            />
          </div>
          <section>
            <h2 className="text-2xl font-bold mb-4 text-zinc-100">Sinossi</h2>
            <p className="text-lg text-zinc-300 leading-relaxed drop-shadow-md">
              {movie.overview}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 text-zinc-100">Cast Principale</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {cast.map(actor => (
                <div key={actor.id} className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex items-center gap-3 hover:bg-zinc-800/80 transition-colors">
                  <img
                    src={getImageUrl(actor.profile_path, 'w500')}
                    alt={actor.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="overflow-hidden">
                    <div className="font-semibold text-sm truncate">{actor.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{actor.character}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-zinc-900/30 p-6 rounded-xl border border-zinc-800">
            <h3 className="text-lg font-bold mb-4 text-zinc-100">Informazioni</h3>
            <div className="space-y-4 text-sm">
              {director && (
                <div>
                  <div className="text-zinc-500 mb-1">Regia</div>
                  <div className="text-zinc-200 font-medium">{director.name}</div>
                </div>
              )}
              {writers.length > 0 && (
                <div>
                  <div className="text-zinc-500 mb-1">Sceneggiatura</div>
                  <div className="text-zinc-200 font-medium">{writers.map(w => w.name).join(', ')}</div>
                </div>
              )}
              <div>
                <div className="text-zinc-500 mb-1">Status</div>
                <div className="text-zinc-200 font-medium">{movie.status}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {collection && (
        <div className="container mx-auto px-4">
          <CategorySection
            title={`Saga: ${collection.name}`}
            items={collection.parts.filter(p => p.id !== movie.id)}
          />
        </div>
      )}

      <div className="container mx-auto px-4">
        <CategorySection
          title="Titoli Simili"
          items={similarMovies}
        />
      </div>

      <MovieStatusChecker tmdbId={movie.id} />
    </main>
  );
}
