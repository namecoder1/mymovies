'use client';

import React, { useMemo, useState } from 'react';
import { useUserMedia } from '@/components/UserMediaProvider';
import { motion } from 'motion/react';
import { Clock, Film, Tv, BarChart3, History, Play, Eye, Check, Star, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useProfile } from '@/components/ProfileProvider';
import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';
import { defineUserAge } from '@/lib/utils';


const ProfilePage = () => {
  const { userMedia, isLoading } = useUserMedia();
  const { currentProfile } = useProfile();
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');


  const {
    history,
    stats,
    mostWatchedGenres,
    totalTimeWatched,
    tasteProfile
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
    let movieFavorites = 0;
    let tvFavorites = 0;

    items.forEach(item => {
      // Stats
      // Count as "watched" only if status is watching or completed
      const isWatched = item.status === 'watching' || item.status === 'completed';

      if (item.mediaType === 'movie') {
        if (isWatched) movieCount++;
        if (item.isFavorite) movieFavorites++;
      } else {
        if (isWatched) tvCount++;
        if (item.isFavorite) tvFavorites++;
      }

      // Duration (accumulated progress or estimate)
      // If we have progress, use it.
      if (item.progress) {
        if (item.mediaType === 'tv') {
          totalDuration += item.progress * 60; // Convert minutes to seconds
        } else {
          totalDuration += item.progress; // Already in seconds
        }
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


    // Taste Analysis Logic
    const genreDeltas: Record<string, { totalDelta: number; count: number }> = {};

    items.forEach(item => {
      // Only consider items with a user vote and a TMDB rating
      if (item.vote && item.rating) {
        // Normalize User Vote (1-5) to TMDB Scale (1-10)
        // We multiply by 2 to match the 10-point scale
        const userScore = Number(item.vote) * 2;
        const delta = userScore - item.rating;

        if (item.genres && Array.isArray(item.genres)) {
          item.genres.forEach((g: any) => {
            if (g.name) {
              if (!genreDeltas[g.name]) {
                genreDeltas[g.name] = { totalDelta: 0, count: 0 };
              }
              genreDeltas[g.name].totalDelta += delta;
              genreDeltas[g.name].count += 1;
            }
          });
        }
      }
    });

    const tasteProfile = Object.entries(genreDeltas)
      .map(([name, data]) => ({
        name,
        avgDelta: data.totalDelta / data.count,
        count: data.count
      }))
      .filter(g => g.count >= 2) // Minimum 2 ratings to be significant
      .sort((a, b) => b.avgDelta - a.avgDelta);

    const positiveTastes = tasteProfile.filter(t => t.avgDelta > 0.5).slice(0, 3);
    const negativeTastes = tasteProfile.filter(t => t.avgDelta < -0.5).reverse().slice(0, 3);

    return {
      history: sorted,
      stats: { movieCount, tvCount, movieFavorites, tvFavorites },
      mostWatchedGenres: genreList,
      totalTimeWatched: Math.floor(totalDuration / 60), // in minutes
      tasteProfile: { positive: positiveTastes, negative: negativeTastes }
    };
  }, [userMedia]);


  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading profile...</div>;
  }

  function showContentStatus(status: string) {
    if (status === 'watching') return <Eye size={20} />;
    if (status === 'completed') return <Check size={20} />;
    return null;
  }

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true;
    return item.mediaType === filter;
  });

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
            className="w-16 h-16 rounded-2xl bg-white"
          />
          <div>
            <h1 className="text-3xl font-bold">Il tuo Profilo</h1>
            <p className="text-zinc-400">Bentornato su Famflix, {currentProfile?.name}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />}
            label="Tempo visione"
            value={`${Math.floor(totalTimeWatched / 60)}h ${totalTimeWatched % 60}m`}
          />
          <StatsCard
            icon={<Film className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />}
            label="Film visti"
            value={stats.movieCount.toString()}
            value2={stats.movieFavorites.toString()}
          />
          <StatsCard
            icon={<Tv className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />}
            label="Serie TV"
            value={stats.tvCount.toString()}
            value2={stats.tvFavorites.toString()}
          />
          <StatsCard
            icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />}
            label="Preferito"
            value={mostWatchedGenres[0]?.name || '-'}
          />
        </div>

        {/* Taste Analysis Section */}
        {(tasteProfile.positive.length > 0 || tasteProfile.negative.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Tastes */}
            <div className="relative overflow-hidden bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50 group hover:border-emerald-500/20 transition-colors">
              <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative">
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                  Gusti Personali
                </h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Generi che apprezzi più della media.
                </p>
                <div className="space-y-4">
                  {tasteProfile.positive.length > 0 ? (
                    tasteProfile.positive.map((genre, i) => (
                      <div key={genre.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-zinc-200">{genre.name}</span>
                          <span className="font-bold text-emerald-400">+{genre.avgDelta.toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.min((genre.avgDelta / 3) * 100, 100)}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-600 gap-2">
                      <BarChart3 className="w-8 h-8 opacity-20" />
                      <p className="text-xs">Nessun dato sufficiente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Negative Tastes */}
            <div className="relative overflow-hidden bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50 group hover:border-red-500/20 transition-colors">
              <div className="absolute inset-0 bg-linear-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative">
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-red-400">
                  <TrendingDown className="w-5 h-5" />
                  Gusti Critici
                </h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Generi su cui sei più severo della media.
                </p>
                <div className="space-y-4">
                  {tasteProfile.negative.length > 0 ? (
                    tasteProfile.negative.map((genre, i) => (
                      <div key={genre.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-zinc-200">{genre.name}</span>
                          <span className="font-bold text-red-400">{genre.avgDelta.toFixed(1)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.min((Math.abs(genre.avgDelta) / 3) * 100, 100)}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="h-full bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-zinc-600 gap-2">
                      <BarChart3 className="w-8 h-8 opacity-20" />
                      <p className="text-xs">Nessun dato sufficiente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Column: History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <History className="w-6 h-6" />
                Cronologia Visione
              </h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${filter === 'all'
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setFilter('movie')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${filter === 'movie'
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  Film
                </button>
                <button
                  onClick={() => setFilter('tv')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${filter === 'tv'
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  Serie TV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredHistory.length === 0 ? (
                <div className="col-span-full">
                  <p className="text-zinc-500">
                    {filter === 'all'
                      ? 'Non hai ancora guardato nulla.'
                      : `Non hai ancora guardato nessun ${filter === 'movie' ? 'film' : 'serie TV'}.`}
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <motion.div
                    key={item.tmdbId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/80 transition-all group overflow-hidden h-32 sm:h-40"
                  >
                    <div className="relative shrink-0 aspect-2/3 h-full">
                      <img
                        src={getImageUrl(item.posterPath, 'w500', 'content')}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-r from-black/20 to-transparent sm:hidden" />
                    </div>

                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-sm sm:text-base group-hover:text-red-500 transition-colors line-clamp-1 flex items-center gap-2 truncate">
                            <span className="shrink-0">{showContentStatus(item.status || '')}</span>
                            <span className="truncate">{item.title}</span>
                          </h3>
                          <span className="hidden sm:inline-flex text-[10px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded-full border border-zinc-800 shrink-0">
                            {item.mediaType === 'movie' ? 'Film' : 'Serie TV'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.genres ? (
                            item.genres?.slice(0, 2).map((g: any) => (
                              <span key={g.id} className="text-[10px] text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">
                                {g.name}
                              </span>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500">
                              No generi
                            </p>
                          )}
                        </div>

                      </div>

                      <div className="flex items-end justify-between mt-1 gap-2">
                        <div className="flex flex-col gap-0.5">
                          {item.vote && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <Star className="w-3 h-3 fill-current text-yellow-500" />
                              <p className="text-xs text-zinc-400 font-medium">{item.vote}</p>
                            </div>
                          )}
                          {item.mediaType === 'tv' && item.lastSeason && (
                            <p className="text-xs text-zinc-400 font-medium">
                              S{item.lastSeason}:E{item.lastEpisode}
                            </p>
                          )}
                          <div className="text-[10px] text-zinc-600">
                            {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true, locale: it })}
                          </div>
                        </div>
                        <Link
                          href={item.mediaType === 'movie' ? `/movies/${item.tmdbId}` : `/tv/${item.tmdbId}`}
                          className="p-2 bg-red-600 rounded-full hover:bg-red-700 text-white transition-colors shadow-lg shadow-red-900/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
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
                      <span className="text-zinc-500">{(genre.count / history.length * 100).toFixed(1)}%</span>
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

function StatsCard({ icon, label, value, value2 }: { icon: React.ReactNode, label: string, value: string, value2?: string }) {
  return (
    <div className="bg-zinc-900/50 p-3 sm:p-6 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 h-full relative overflow-hidden group">
      <div className="p-2 sm:p-3 bg-zinc-950 rounded-lg border border-zinc-900 group-hover:border-zinc-700 transition-colors shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-zinc-500 truncate">{label}</p>
        <p className="text-lg sm:text-2xl font-bold truncate tracking-tight">
          {value}
          <span className="text-zinc-600 font-normal ml-0.5">{value2 ? `/ ${value2}` : ''}</span>
        </p>
      </div>
    </div>
  );
}

export default ProfilePage;