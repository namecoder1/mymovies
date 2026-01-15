'use client'

import Link from 'next/link';
import SearchInput from './SearchInput';
import ProfileSwitcher from './ProfileSwitcher';
import { useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { User } from '@supabase/supabase-js';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchInfo = async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchInfo();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  

  function checkRoute(route: string) {
    if (pathname === route) return true;
    return false;
  }

  if (!user) {
    return (
      <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="text-2xl font-bold text-red-600 tracking-tighter hover:scale-105 transition-transform flex ">
              Famflix
            </Link>
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/movies" className={checkRoute('/movies') ? 'text-red-500' : 'text-white hover:text-red-600 transition-colors'}>
                Film
              </Link>
              <Link href="/tv" className={checkRoute('/tv') ? 'text-red-500' : 'text-white hover:text-red-600 transition-colors'}>
                Serie TV
              </Link>
              <Link href="/favorites" className={checkRoute('/favorites') ? 'text-red-500' : 'text-white hover:text-red-600 transition-colors'}>
                Preferiti
              </Link>
            </div>
          </div>
          <ProfileSwitcher user={user} />
        </div>
      </nav>
    )
  }

  return (
    <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-2xl font-bold text-red-600 tracking-tighter hover:scale-105 transition-transform">
            Famflix
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/movies" className={checkRoute('/movies') ? 'text-red-500' : 'text-white hover:text-red-600 transition-colors'}>
              Film
            </Link>
            <Link href="/tv" className={checkRoute('/tv') ? 'text-red-500' : 'text-white hover:text-red-600 transition-colors'}>
              Serie TV
            </Link>
            <Link href="/favorites" className={checkRoute('/favorites') ? 'text-red-500' : 'text-white hover:text-red-600 transition-colors'}>
              Preferiti
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block w-64">
            <SearchInput />
          </div>
          <div className='md:hidden mt-2'>
            <SearchInput version="mobile" />
          </div>
          <ProfileSwitcher user={user} />
          <div className='md:hidden'>
            <MenuButton />
          </div>
        </div>
      </div>
      {/* Mobile Search - Visible only on small screens */}
    </nav>
  );
}

const MenuButton = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='icon'>
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem>
          <Link href="/movies" className="text-white hover:text-red-600 transition-colors">
            Film
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/tv" className="text-white hover:text-red-600 transition-colors">
            Serie TV
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/favorites" className="text-white hover:text-red-600 transition-colors">
            Preferiti
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}