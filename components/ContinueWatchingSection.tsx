'use client';

import { useProfile } from './ProfileProvider';
import { getWatchList } from '@/lib/actions';
import { useEffect, useState } from 'react';
import CategorySection from './CategorySection';
import { ContentItem } from '@/lib/types';
import { useUserMedia } from './UserMediaProvider';

export default function ContinueWatchingSection({ mediaType }: { mediaType?: 'movie' | 'tv' }) {
  const { userMedia, isLoading } = useUserMedia();
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    // Convert map to array and filter
    const allItems = Array.from(userMedia.values());

    const watching = allItems
      .filter(item => item.status === 'watching')
      .filter(item => !mediaType || item.mediaType === mediaType)
      .map(item => ({
        id: item.tmdbId,
        title: item.title || '',
        name: item.mediaType === 'tv' ? (item.title || '') : '',
        poster_path: item.posterPath || '',
        media_type: item.mediaType,
        vote_average: item.rating || 0,
        release_date: item.releaseDate || '',
        first_air_date: item.releaseDate || '',
        progress: item.progress,
        totalDuration: item.totalDuration,
        // Add required fields for ContentItem type
        backdrop_path: '',
        overview: '',
        genre_ids: [],
        original_language: '',
        popularity: 0,
        vote_count: 0,
        video: false,
        adult: false,
        last_season: item.lastSeason,
        last_episode: item.lastEpisode,
      }));

    setItems(watching);
  }, [userMedia, mediaType]);

  if (items.length === 0) return null;

  const title = mediaType === 'movie' ? "Film che stai guardando" :
    mediaType === 'tv' ? "Serie TV che stai guardando" :
      "Continua a guardare";

  return (
    <div className='mt-20'>
      <CategorySection
        title={title}
        items={items}
        showStatusToggle={true}
      />
    </div>
  );
}
