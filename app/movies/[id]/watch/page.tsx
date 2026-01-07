import { getMovieDetails } from '@/lib/tmdb';
import { getWatchStatus } from '@/lib/actions';
import VideoPlayer from '@/components/VideoPlayer';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function WatchMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovieDetails(id);

  const cookieStore = await cookies();
  const profileId = cookieStore.get('profile_id')?.value;
  let startTime = 0;

  if (profileId) {
    const { getMovieProgress } = await import('@/lib/actions');
    const progressData = await getMovieProgress(profileId, Number(id));
    if (progressData?.progress) {
      startTime = progressData.progress;
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-50">
      <Link
        href={`/movies/${id}`}
        className="absolute top-4 left-4 z-50 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </Link>

      <VideoPlayer
        tmdbId={movie.id}
        mediaType="movie"
        title={movie.title}
        posterPath={movie.poster_path || ''}
        totalDuration={movie.runtime}
        genres={JSON.stringify(movie.genres || [])}
        startTime={startTime}
      />
    </div>
  );
}