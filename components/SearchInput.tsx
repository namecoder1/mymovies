'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

export default function SearchInput({ version = 'desktop' }: { version?: 'mobile' | 'desktop' }) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  if (version === 'mobile') {
    return (
      <div>
        <button onClick={ () => setOpen(true)}>
          <Search />
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent showCloseButton={false} className='rounded-full top-[20%]'>
            <DialogTitle className='hidden'>Cerca film o serie</DialogTitle>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Cerca film o serie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-zinc-700 transition-all placeholder:text-zinc-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Button onClick={handleSearch} className='absolute right-0 top-1/2 -translate-y-1/2 w-10 h-full bg-red-500 hover:bg-red-600 flex items-center justify-center rounded-full rounded-l-none'>
                <Search className="h-4 text-white" />
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="text"
        placeholder="Cerca film o serie..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-zinc-800 text-white rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-zinc-700 transition-all placeholder:text-zinc-400"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <Button onClick={handleSearch} className='absolute right-0 top-1/2 -translate-y-1/2 w-10 h-full bg-red-500 hover:bg-red-600 flex items-center justify-center rounded-full rounded-l-none'>
        <Search className="h-4 text-white" />
      </Button>
    </form>
  );
}
