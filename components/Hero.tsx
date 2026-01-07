import Link from 'next/link';
import { ContentItem } from '@/lib/types';
import { getImageUrl } from '@/lib/tmdb';
import { Play, Info } from 'lucide-react';
import WatchListButton from './WatchListButton';

export default function Hero({ item }: { item: ContentItem }) {
  const link = item.media_type === 'movie' ? `/movies/${item.id}` : `/tv/${item.id}`;
  const title = item.media_type === 'movie' ? item.title : item.name;
  const date = item.media_type === 'movie' ? item.release_date : item.first_air_date;
  const backdrop = getImageUrl(item.backdrop_path, 'original');

  return (
    <div className="relative h-[70vh] mb-10 w-full flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={backdrop}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 relative mt-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-lg tracking-tight">
            {title}
          </h1>
          <p className="text-lg text-zinc-300 mb-8 line-clamp-3 drop-shadow-md">
            {item.overview}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href={link}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full flex items-center gap-2 transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              Guarda Ora
            </Link>
            <WatchListButton
              tmdbId={item.id}
              mediaType={item.media_type || 'movie'}
              title={title}
              releaseDate={date}
              posterPath={item.poster_path || ''}
              voteAverage={item.vote_average}
              className="hidden sm:flex"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
