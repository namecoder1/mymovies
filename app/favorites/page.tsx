'use client';
import { useProfile } from '@/components/ProfileProvider';
import { ContentItem } from '@/lib/types';
import { Heart } from 'lucide-react';
import React, { useMemo } from 'react';
import CategorySection from '@/components/CategorySection';
import { useUserMedia } from '@/components/UserMediaProvider';

const FavoritesPage = () => {
    const { currentProfile } = useProfile();
    const { userMedia, isLoading } = useUserMedia();

    const favorites = useMemo(() => {
        if (!currentProfile) return [];

        const allItems = Array.from(userMedia.values());
        
        return allItems
            .filter(item => item.isFavorite)
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
                // Add required fields to match ContentItem type
                backdrop_path: '',
                overview: '',
                genre_ids: [],
                original_language: '',
                popularity: 0,
                vote_count: 0,
                video: false,
                adult: false,
            } as ContentItem));
    }, [userMedia, currentProfile]);

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

    return (
        <div className='min-h-screen bg-black pt-24 pb-10'>
            <div className='container mx-auto px-4 mb-8'>
                <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-8 h-8 text-red-600 fill-red-600" />
                    <h1 className='text-4xl font-bold text-white'>I tuoi Preferiti</h1>
                </div>
                <p className='text-zinc-400'>Tutti i film e le serie TV che ami.</p>
            </div>

            <div className='container mx-auto px-4'>
                {/* Show loading state only within the content area if strictly needed, 
                    but usually we want to show whatever we have or empty state */}
                
                {favorites.length > 0 ? (
                    <CategorySection
                        title=""
                        items={favorites}
                    />
                ) : (
                    // We can show a loading skeleton here if isLoading is true and no favorites yet,
                    // or just "No favorites" if loaded.
                    isLoading ? (
                         <div className="flex gap-4 overflow-x-auto pb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="min-w-[160px] h-[240px] bg-zinc-900 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <p className="text-zinc-500 text-lg">Non hai ancora aggiunto nulla ai preferiti.</p>
                    )
                )}
            </div>
        </div>
    )
}

export default FavoritesPage;
