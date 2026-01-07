import { useProfile } from './ProfileProvider';
import { LogOut, UserCircle, User as UserIcon, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { logout } from '@/supabase/actions';

type Profile = {
  id: string;
  name: string;
  short: string;
  avatar_url: string | null;
};

export default function ProfileSwitcher({ user }: { user: User | null }) {
  const { currentProfile, switchProfile } = useProfile();

  if (!user) {
    return (
      <div className="relative">
        <Link
          href="/login"
          className="flex items-center gap-2 text-white p-2 rounded-full transition-colors"
        >
          <div className="w-8 h-8 rounded bg-neutral-200 flex items-center justify-center text-sm font-bold">
            <UserIcon size={16} color='black' />
          </div>
        </Link>
      </div >
    )
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 text-white p-2 rounded-full transition-colors"
          >
            <div className="w-8 h-8 rounded bg-neutral-200 flex items-center justify-center text-sm font-bold">
              {currentProfile ? (
                <div>
                  <Image
                    src={currentProfile.avatar_url || '/avatar.png'}
                    alt={currentProfile.name}
                    width={24}
                    height={24}
                    className="w-8 h-8 rounded"
                  />
                  <span className="text-[8px] font-bold absolute bottom-1 right-1 bg-white h-5 w-5 rounded-full text-black flex items-center justify-center">{currentProfile.short}</span>
                </div>
              ) : <UserIcon size={16} />}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={() => switchProfile(null)}>
            <Users size={16} />
            <span>Cambia account</span>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href='/profile'>
              <UserCircle size={16} />
              <span>Profilo</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={() => {logout()}}>
            <LogOut size={16} />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div >
  );
}
