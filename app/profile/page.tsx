'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUserMedia } from '@/components/UserMediaProvider';
import { motion } from 'motion/react';
import { Clock, Film, Tv, BarChart3, History, Play } from 'lucide-react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/supabase/client';
import { useProfile } from '@/components/ProfileProvider';
import Image from 'next/image';


const ProfilePage = () => {
  const { userMedia, isLoading } = useUserMedia();
  const { currentProfile, switchProfile } = useProfile();


  const {
    history,
    stats,
    mostWatchedGenres,
    totalTimeWatched
  } = useMemo(() => {
    const items = Array.from(userMedia.values());

    // Sort by updated_at desc
    const sorted = [...items].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const genreCounts: Record<string, number> = {};
    let totalDuration = 0;
    let movieCount = 0;
    let tvCount = 0;

    items.forEach(item => {
      // Stats
      if (item.mediaType === 'movie') movieCount++;
      else tvCount++;

      // Duration (accumulated progress or estimate)
      // If we have progress, use it.
      if (item.progress) {
        totalDuration += item.progress; // in seconds
      }

      // Genres
      if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach((g: any) => {
          if (g.name) {
            genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
          }
        });
      }
    });

    const genreList = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5) // Top 5
      .map(([name, count]) => ({ name, count }));

    return {
      history: sorted,
      stats: { movieCount, tvCount },
      mostWatchedGenres: genreList,
      totalTimeWatched: Math.floor(totalDuration / 60) // in minutes
    };
  }, [userMedia]);

  const getImageUrl = (path: string | null) =>
    path ? `https://image.tmdb.org/t/p/w500${path}` : '/placeholder.png'; // Simple helper

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading profile...</div>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-20 pt-24 px-4">
      <div className="container mx-auto max-w-6xl space-y-12">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Image
            src={currentProfile?.avatar_url as any}
            alt='Immagine profilo'
            width={64}
            height={64}
            className="w-16 h-16 rounded-2xl"
          />
          <div>
            <h1 className="text-3xl font-bold">Il tuo Profilo</h1>
            <p className="text-zinc-400">Bentornato su Famflix, {currentProfile?.name}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<Clock className="w-6 h-6 text-blue-400" />}
            label="Tempo di visione"
            value={`${Math.floor(totalTimeWatched / 60)}h ${totalTimeWatched % 60}m`}
          />
          <StatsCard
            icon={<Film className="w-6 h-6 text-purple-400" />}
            label="Film Guardati"
            value={stats.movieCount.toString()}
          />
          <StatsCard
            icon={<Tv className="w-6 h-6 text-green-400" />}
            label="Serie TV"
            value={stats.tvCount.toString()}
          />
          <StatsCard
            icon={<BarChart3 className="w-6 h-6 text-yellow-400" />}
            label="Genere Preferito"
            value={mostWatchedGenres[0]?.name || '-'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Column: History */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6" />
              Cronologia Visione
            </h2>

            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-zinc-500">Non hai ancora guardato nulla.</p>
              ) : (
                history.map((item) => (
                  <motion.div
                    key={item.tmdbId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/80 transition-colors group"
                  >
                    <img
                      src={getImageUrl(item.posterPath)}
                      alt={item.title}
                      className="w-20 h-30 object-cover rounded-md shadow-md"
                    />
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg group-hover:text-red-500 transition-colors line-clamp-1">{item.title}</h3>
                          <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded-full border border-zinc-800 uppercase">
                            {item.mediaType}
                          </span>
                        </div>
                        {item.mediaType === 'tv' && item.lastSeason && (
                          <p className="text-sm text-zinc-400 mt-1">
                            S{item.lastSeason} E{item.lastEpisode}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {item.genres ? (
                            item.genres?.slice(0, 3).map((g: any) => (
                              <span key={g.id} className="text-xs text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">
                                {g.name}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-zinc-500">
                              Inizia a guardare il contenuto per scoprire i suoi generi
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-zinc-500">
                          Ultima visione: {new Date(item.updatedAt).toLocaleDateString()}
                        </div>
                        <Link
                          href={item.mediaType === 'movie' ? `/movies/${item.tmdbId}` : `/tv/${item.tmdbId}`}
                          className="p-2 bg-red-600 rounded-full hover:bg-red-700 text-white transition-colors"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar: Genre Stats */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Generi
            </h2>

            <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800 space-y-6">
              {mostWatchedGenres.length === 0 ? (
                <p className="text-zinc-500 text-sm">Nessun dato disponibile</p>
              ) : (
                mostWatchedGenres.map((genre, i) => (
                  <div key={genre.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-zinc-200">{genre.name}</span>
                      <span className="text-zinc-500">{genre.count} titoli</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(genre.count / history.length) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`h-full rounded-full ${i === 0 ? 'bg-red-500' : 'bg-zinc-600'}`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}

function StatsCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 flex items-center gap-4">
      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900">
        {icon}
      </div>
      <div>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default ProfilePage;