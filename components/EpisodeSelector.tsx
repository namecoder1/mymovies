'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, List } from 'lucide-react';
import Link from 'next/link';

interface Episode {
  episode_number: number;
  name: string;
  still_path: string | null;
  runtime: number;
  overview: string;
  progress?: number;
  duration?: number;
}

interface Season {
  season_number: number;
  name: string;
  episodes: Episode[];
}

interface EpisodeSelectorProps {
  tmdbId: number;
  currentSeason: number;
  currentEpisode: number;
  seasons: Season[];
  isVisible: boolean;
}

export default function EpisodeSelector({
  tmdbId,
  currentSeason,
  currentEpisode,
  seasons,
  isVisible,
}: EpisodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(
    new Set([currentSeason])
  );

  const toggleSeason = (seasonNumber: number) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonNumber)) {
      newExpanded.delete(seasonNumber);
    } else {
      newExpanded.add(seasonNumber);
    }
    setExpandedSeasons(newExpanded);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-6 z-50 flex items-center gap-2 bg-black/70 hover:bg-black/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg transition-all border border-white/20"
      >
        <List className="w-5 h-5" />
        <span className="font-semibold">Episodi</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Content */}
          <div className="absolute top-20 right-8 z-50 w-96 max-h-[70vh] overflow-y-auto bg-black/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 animate-fade-in">
            <div className="p-4 border-b border-white/10 sticky top-0 bg-black/95 backdrop-blur-xl z-10">
              <h3 className="text-white font-bold text-lg">Seleziona Episodio</h3>
            </div>

            <div className="p-3">
              {seasons.map((season) => (
                <div key={season.season_number} className="mb-2">
                  <button
                    onClick={() => toggleSeason(season.season_number)}
                    className="w-full flex items-center justify-between px-4 py-1 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="text-white font-semibold">
                      {season.name}
                    </span>
                    {expandedSeasons.has(season.season_number) ? (
                      <ChevronUp className="w-5 h-5 text-white" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white" />
                    )}
                  </button>

                  {expandedSeasons.has(season.season_number) && (
                    <div className="mt-2 space-y-2">
                      {season.episodes.map((episode) => {
                        const isCurrent =
                          season.season_number === currentSeason &&
                          episode.episode_number === currentEpisode;

                        const progressPercentage = episode.progress && episode.duration
                          ? (episode.progress / episode.duration) * 100
                          : 0;

                        return (
                          <Link
                            key={episode.episode_number}
                            href={`/tv/${tmdbId}/watch?season=${season.season_number}&episode=${episode.episode_number}`}
                            className={`block p-2 rounded-lg transition-all ${isCurrent
                                ? 'bg-white/20 border border-white/30'
                                : 'hover:bg-white/10'
                              }`}
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="flex items-start gap-3">
                              {/* Thumbnail */}
                              <div className="relative shrink-0">
                                {episode.still_path ? (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w185${episode.still_path}`}
                                    alt={episode.name}
                                    className="w-28 h-16 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-28 h-16 bg-gray-800 rounded flex items-center justify-center">
                                    <span className="text-gray-500 text-xs">No Image</span>
                                  </div>
                                )}

                                {/* Progress Bar */}
                                {progressPercentage > 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-b">
                                    <div
                                      className="h-full bg-red-600 rounded-b"
                                      style={{ width: `${progressPercentage}%` }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Episode Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  <span className="text-white font-medium text-sm flex-1">
                                    {episode.episode_number}. {episode.name}
                                  </span>
                                  {isCurrent && (
                                    <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                                  )}
                                </div>

                                <p className="text-gray-400 line-clamp-2 text-xs mt-1">
                                  {episode.overview || 'Nessuna descrizione per l\'episodio'}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
