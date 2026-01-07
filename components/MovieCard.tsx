import Link from 'next/link';
import { ContentItem } from '@/lib/types';
import { getImageUrl } from '@/lib/tmdb';
import { Star } from 'lucide-react';
import WatchListButton from './WatchListButton';

export default function MovieCard({ item, showStatusToggle = false, onStatusChange }: { item: ContentItem, showStatusToggle?: boolean, onStatusChange?: () => void }) {
  const link = item.media_type === 'movie' ? `/movies/${item.id}` : `/tv/${item.id}`;
  const title = item.media_type === 'movie' ? item.title : item.name;
  const date = item.media_type === 'movie' ? item.release_date : item.first_air_date;

  return (
    <Link href={link} className="group relative block aspect-2/3 overflow-hidden rounded-lg bg-zinc-900 transition-transform hover:scale-105 hover:z-10 hover:shadow-2xl hover:shadow-red-900/20">
      <img
        src={getImageUrl(item.poster_path)}
        alt={title}
        className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
        loading="lazy"
      />

      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <WatchListButton
          tmdbId={item.id}
          mediaType={item.media_type || 'movie'}
          title={title}
          releaseDate={date}
          posterPath={item.poster_path || ''}
          voteAverage={item.vote_average}
          minimal={true}
          showStatusToggle={showStatusToggle}
          onStatusChange={onStatusChange}
        />
      </div>

      {/* Overlay with info on hover (desktop) or always visible minimal info */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-linear-to-t from-black via-black/50 to-transparent">
        <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">{title}</h3>

        {item.media_type === 'tv' && item.last_season && item.last_episode && (
          <div className="text-xs font-medium text-red-400 mb-1">
            S{item.last_season} E{item.last_episode}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-zinc-300 mt-1">
          <span className="flex items-center gap-1 text-yellow-400">
            <Star className="w-3 h-3 fill-yellow-400" /> {item.vote_average?.toFixed(1)}
          </span>
          <span>•</span>
          <span>{date?.split('-')[0]}</span>
        </div>
      </div>

      {item.progress && item.progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600 z-30">
          <div
            className="h-full bg-red-600"
            style={{
              width: `${Math.min(100, (item.progress / (item.totalDuration || 1)) * 100)}%`
            }}
          />
        </div>
      )}
    </Link>
  );
}
