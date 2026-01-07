'use client';
import { useProfile } from '@/components/ProfileProvider';
import { ContentItem } from '@/lib/types';
import { Heart } from 'lucide-react';
import React, { useMemo } from 'react';
import CategorySection from '@/components/CategorySection';
import { useUserMedia } from '@/components/UserMediaProvider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FavoritesPage = () => {
  const { currentProfile } = useProfile();
  const { userMedia, isLoading } = useUserMedia();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest'>('newest');

  const filteredItems = useMemo(() => {
    if (!currentProfile) return { movies: [], series: [] };

    let items = Array.from(userMedia.values())
      .filter(item => item.isFavorite) // Only favorites
      .map(item => ({
        ...item,
        // Ensure properties needed for ContentItem and sorting are present
        name: item.mediaType === 'tv' ? (item.title || '') : '',
        title: item.title || '',
        vote_average: item.rating || 0,
        release_date: item.releaseDate || '',
        first_air_date: item.releaseDate || '',
        id: item.tmdbId,
        media_type: item.mediaType,
        poster_path: item.posterPath || '',
        // Add required fields to match ContentItem type
        backdrop_path: '',
        overview: '',
        genre_ids: [],
        original_language: '',
        popularity: 0,
        vote_count: 0,
        video: false,
        adult: false,
      }));

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        (item.title || '').toLowerCase().includes(query)
      );
    }

    // Sort items
    items.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Split into categories
    const movies = items.filter(item => item.mediaType === 'movie');
    const series = items.filter(item => item.mediaType === 'tv');

    return { movies, series };
  }, [userMedia, currentProfile, searchQuery, sortOrder]);

  if (!currentProfile) {
    return (
      <div className='min-h-screen bg-black pt-24 pb-10 flex items-center justify-center'>
        <div className="text-center">
          <h1 className='text-4xl font-bold text-white mb-4'>Preferiti</h1>
          <p className='text-zinc-400'>Seleziona un profilo per vedere i tuoi preferiti.</p>
        </div>
      </div>
    );
  }

  const hasFavorites = userMedia.size > 0 && Array.from(userMedia.values()).some(i => i.isFavorite);
  const showContent = filteredItems.movies.length > 0 || filteredItems.series.length > 0;

  return (
    <div className='min-h-[80vh] bg-black pt-24 pb-10'>
      <div className='container mx-auto px-4 mb-8'>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className='text-4xl font-bold text-white'>I tuoi Preferiti</h1>
            <p className='text-zinc-400 mt-1'>Tutti i film e le serie TV che ami.</p>
          </div>

          {/* Controls */}
          {hasFavorites && (
            <div className="flex items-center gap-4">
              <Input
                type="text"
                placeholder="Cerca nei preferiti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <Select value={sortOrder} onValueChange={setSortOrder as any}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='newest'>Più recenti</SelectItem>
                  <SelectItem value='oldest'>Meno recenti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className='container mx-auto px-4 space-y-12'>
        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="min-w-[160px] h-[240px] bg-zinc-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !hasFavorites ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">Non hai ancora aggiunto nulla ai preferiti.</p>
          </div>
        ) : !showContent ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">Nessun risultato trovato per &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <>
            {filteredItems.movies.length > 0 && (
              <CategorySection
                title="Film Preferiti"
                items={filteredItems.movies as ContentItem[]}
                showStatusToggle={false}
              />
            )}

            {filteredItems.series.length > 0 && (
              <CategorySection
                title="Serie TV Preferite"
                items={filteredItems.series as ContentItem[]}
                showStatusToggle={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default FavoritesPage;
