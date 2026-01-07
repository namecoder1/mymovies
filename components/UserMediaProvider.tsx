'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useProfile } from './ProfileProvider';
import { WatchStatus } from '@/lib/actions';

type UserMediaItem = {
    id: number; // Supabase ID
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    status: WatchStatus | null;
    isFavorite: boolean;
    vote: 'like' | 'dislike' | null;
    progress: number;
    updatedAt: string;
    // Metadata for UI
    title: string;
    posterPath: string;
    releaseDate?: string;
    rating?: number;
    totalDuration?: number;
    lastSeason?: number;
    lastEpisode?: number;
};

type UserMediaContextType = {
    userMedia: Map<number, UserMediaItem>; // Key is tmdbId
    isLoading: boolean;
    refreshMedia: () => Promise<void>;
    updateLocalMedia: (item: Partial<UserMediaItem> & { tmdbId: number }) => void;
};

const UserMediaContext = createContext<UserMediaContextType | undefined>(undefined);

export function UserMediaProvider({ children }: { children: React.ReactNode }) {
    const { currentProfile } = useProfile();
    const [userMedia, setUserMedia] = useState<Map<number, UserMediaItem>>(new Map());
    const [isLoading, setIsLoading] = useState(false);

    const fetchUserMedia = useCallback(async () => {
        if (!currentProfile) {
            setUserMedia(new Map());
            return;
        }

        setIsLoading(true);
        try {
            // Client-side fetch to avoid server action overhead for bulk data
            const { createClient } = await import('@/supabase/client');
            const supabase = createClient();
            
            const { data, error } = await supabase
                .from('user_media')
                .select('*')
                .eq('profile_id', currentProfile.id);

            if (error) throw error;

            const map = new Map<number, UserMediaItem>();
            data?.forEach(item => {
                map.set(item.tmdb_id, {
                    id: item.id,
                    tmdbId: item.tmdb_id,
                    mediaType: item.media_type,
                    status: item.status,
                    isFavorite: item.is_favorite,
                    vote: item.vote,
                    progress: item.progress || 0,
                    updatedAt: item.updated_at,
                    title: item.title || '',
                    posterPath: item.poster_path || '',
                    releaseDate: item.release_date || '',
                    rating: item.rating,
                    totalDuration: item.total_duration,
                    lastSeason: item.last_season,
                    lastEpisode: item.last_episode
                });
            });

            setUserMedia(map);
        } catch (error) {
            console.error('Failed to fetch user media', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentProfile]);

    useEffect(() => {
        fetchUserMedia();
    }, [fetchUserMedia]);

    const updateLocalMedia = useCallback((item: Partial<UserMediaItem> & { tmdbId: number }) => {
        setUserMedia(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(item.tmdbId) || {
                id: 0,
                tmdbId: item.tmdbId,
                mediaType: 'movie',
                status: null,
                isFavorite: false,
                vote: null,
                progress: 0,
                updatedAt: new Date().toISOString(),
                title: '',
                posterPath: ''
            };

            newMap.set(item.tmdbId, { ...existing, ...item });
            return newMap;
        });
    }, []);

    return (
        <UserMediaContext.Provider value={{ userMedia, isLoading, refreshMedia: fetchUserMedia, updateLocalMedia }}>
            {children}
        </UserMediaContext.Provider>
    );
}

export function useUserMedia() {
    const context = useContext(UserMediaContext);
    if (context === undefined) {
        throw new Error('useUserMedia must be used within a UserMediaProvider');
    }
    return context;
}

export function useMediaItem(tmdbId: number) {
    const { userMedia } = useUserMedia();
    return userMedia.get(tmdbId);
}
