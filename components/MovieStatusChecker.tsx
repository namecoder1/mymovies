'use client';

import { useEffect } from 'react';
import { useProfile } from '@/components/ProfileProvider';
import { checkAndCompleteMovie } from '@/lib/actions';

export default function MovieStatusChecker({ tmdbId }: { tmdbId: number }) {
  const { currentProfile } = useProfile();

  useEffect(() => {
    async function check() {
      if (currentProfile) {
        await checkAndCompleteMovie(currentProfile.id, tmdbId);
      }
    }

    check();
  }, [currentProfile, tmdbId]);

  return null;
}
