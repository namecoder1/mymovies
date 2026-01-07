'use client';

import { useState } from 'react';
import { ContentItem } from "@/lib/types";
import MovieCard from "./MovieCard";
import { LayoutGrid, GalleryHorizontal } from 'lucide-react';
import { cn } from "@/lib/utils";

interface CategorySectionProps {
  title: string;
  items: ContentItem[];
  showStatusToggle?: boolean;
  onStatusChange?: () => void;
  defaultVariant?: 'carousel' | 'grid';
}

export default function CategorySection({
  title,
  items,
  showStatusToggle = false,
  onStatusChange,
  defaultVariant = 'carousel'
}: CategorySectionProps) {
  const [layout, setLayout] = useState<'carousel' | 'grid'>(defaultVariant);

  if (!items || items.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{title}</h2>

        <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
          <button
            onClick={() => setLayout('carousel')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              layout === 'carousel'
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
            )}
            aria-label="Carousel view"
          >
            <GalleryHorizontal className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLayout('grid')}
            className={cn(
              "p-1.5 rounded-md transition-all",
              layout === 'grid'
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {layout === 'carousel' ? (
        /* Scroll container with padding to align with container but bleed to edges on mobile if needed */
        <div className="relative">
          <div className="flex overflow-x-auto gap-4 px-4 py-4 snap-x scrollbar-hide">
            {items.map((item) => (
              <div key={item.id} className="w-[160px] md:w-[200px] flex-none snap-start">
                <MovieCard item={item} showStatusToggle={showStatusToggle} onStatusChange={onStatusChange} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Grid container */
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {items.map((item) => (
              <MovieCard key={item.id} item={item} showStatusToggle={showStatusToggle} onStatusChange={onStatusChange} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
