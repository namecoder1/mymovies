'use client';

import React, { useState } from 'react';
import { Rating, Star } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';
import { cn } from '@/lib/utils';

// Custom styles to match the dark theme (Zinc-950 background, Yellow-400 stars)
const ratingStyles = {
  itemShapes: Star,
  activeFillColor: '#facc15', // tailwind yellow-400
  inactiveFillColor: '#3f3f46', // tailwind zinc-700
};

interface RatingProps {
  initialValue?: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
  className?: string;
  size?: number;
  // New props for integration
  tmdbId?: number;
  mediaType?: 'movie' | 'tv';
  profileId?: string;
  metadata?: {
    title: string;
    posterPath: string;
    releaseDate?: string;
    genres?: string;
    totalDuration?: number;
  };
}

const RatingComponent = ({
  initialValue = 0,
  readOnly = false,
  onChange,
  className,
  size = 180, // default max-width for the stars container
  tmdbId,
  mediaType,
  profileId,
  metadata
}: RatingProps) => {
  const [rating, setRating] = useState(initialValue);
  const [hovered, setHovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = async (selectedValue: number) => {
    setRating(selectedValue);
    if (onChange) {
      onChange(selectedValue);
    }

    if (tmdbId && profileId && mediaType && metadata) {
      setIsSubmitting(true);
      try {
        const { setUserRating } = await import('@/lib/actions');
        const result = await setUserRating(profileId, tmdbId, selectedValue, mediaType, metadata);
        if (!result.success) {
          console.error("Failed to save rating:", result.error);
        }
      } catch (error) {
        console.error("Error saving rating:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm transition-colors duration-300",
        !readOnly && "hover:bg-zinc-900/80 hover:border-zinc-700",
        className
      )}
      onMouseEnter={() => !readOnly && setHovered(true)}
      onMouseLeave={() => !readOnly && setHovered(false)}
    >
      <div className="flex items-center justify-between mb-1">
        <div className='flex flex-col items-start'>
          <span className="text-sm font-semibold text-zinc-200">
            {readOnly ? 'Valutazione Utenti' : 'La tua valutazione'}
          </span>
          <div className="text-xs text-center text-zinc-500 mt-1 transition-opacity duration-300">
            {rating === 0 ? 'Clicca per votare' : 'Grazie per il tuo voto!'}
          </div>
        </div>
        <div style={{ maxWidth: size, width: '100%' }}>
          <Rating
            value={rating}
            onChange={!readOnly ? handleChange : undefined}
            itemStyles={ratingStyles}
            readOnly={readOnly}
            transition="zoom"
            radius="medium"
            spaceBetween="small"
          />
        </div>
      </div>
    </div>
  );
};

export default RatingComponent;
