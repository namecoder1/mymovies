'use client';

import { useEffect, useState } from 'react';
import { useProfile } from './ProfileProvider';
import { createClient } from '@/supabase/client';
import { Plus, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

type Profile = {
  id: string;
  name: string;
  short: string;
  avatar_url: string | null;
};

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const { currentProfile, switchProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    async function initProfiles() {
      try {
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          return;
        }

        if (mounted) setIsAuthenticated(true);

        // 2. Fetch Profiles
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        const fetchedProfiles = data || [];

        if (mounted) {
          setProfiles(fetchedProfiles);
        }

        // 3. Auto-select if localStorage has ID
        const savedId = localStorage.getItem('profile_id');
        if (savedId) {
          const found = fetchedProfiles.find(p => p.id === savedId);
          if (found) {
            // Ensure cookie matches (sync repair)
            document.cookie = `profile_id=${found.id}; path=/; max-age=31536000; SameSite=Lax`;
            switchProfile(found);
          }
        }
      } catch (err) {
        console.error("Error initializing profiles:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initProfiles();

    return () => { mounted = false; };
  }, []);

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Should allow login

      const { data, error } = await supabase.from('profiles').insert({
        name: newProfileName,
        user_id: user.id
      }).select().single();

      if (error) throw error;
      if (data) {
        setProfiles([...profiles, data]);
        switchProfile(data);
        setIsCreating(false);
        setNewProfileName('');
      }
    } catch (e) {
      console.error("Error creating profile:", e);
    }
  };

  // If we are loading, show a black screen or spinner (optional)
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-600"></div>
      </div>
    );
  }

  // Pass through if not authenticated (Login page will be shown)
  // Or if we are explicitly on the login page (just in case)
  if (!isAuthenticated || pathname === '/login') {
    return <>{children}</>;
  }

  // If we have a profile selected, render children
  if (currentProfile) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="w-full max-w-4xl px-4 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-12">Chi sta guardando?</h1>

        <div className="flex flex-wrap items-center justify-center gap-8 px-6">
          {profiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => switchProfile(profile)}
              className="group flex flex-col items-center gap-4 transition-transform hover:scale-105"
            >
              <div className="relative w-24 h-24 md:w-40 md:h-40 rounded-4xl overflow-hidden ring-4 ring-transparent group-hover:ring-neutral-300 transition-all">
                {profile.avatar_url ? (
                  <div>
                    <Image
                      src={profile.avatar_url}
                      alt={profile.name}
                      fill
                      className="object-cover"
                    />
                    <span className="text-[10px] z-100 font-bold absolute bottom-0 right-0 bg-white h-8 w-8 rounded-tl-2xl text-black flex items-center justify-center">{profile.short}</span>
                  </div>
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-16 h-16 text-zinc-400" />
                  </div>
                )}
              </div>
              <span className="text-zinc-400 group-hover:text-white text-lg md:text-xl transition-colors">
                {profile.name}
              </span>
            </button>
          ))}

          {/* Add Profile Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="group flex flex-col items-center gap-4 transition-transform hover:scale-105"
          >
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-4xl bg-zinc-900 border-2 border-transparent group-hover:bg-zinc-800 flex items-center justify-center">
              <Plus className="w-16 h-16 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </div>
            <span className="text-zinc-500 group-hover:text-zinc-300 text-lg md:text-xl transition-colors">
              Aggiungi
            </span>
          </button>
        </div>

        {isCreating && (
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Nuovo Profilo
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor='name' className="block text-sm font-medium text-zinc-400 mb-2">Nome</Label>
                  <Input
                    id='name'
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Nome profilo"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant='outline'
                    onClick={() => setIsCreating(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleCreateProfile}
                    disabled={!newProfileName.trim()}
                    className='bg-red-500 hover:bg-red-400 text-white'
                  >
                    Crea
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
