"use server";

import { createClient } from "@/supabase/server";
import { revalidatePath } from "next/cache";

export type WatchStatus =
  | "watching"
  | "completed"
  | "dropped"
  | "plan_to_watch";

// Profile Actions
export async function createProfile(name: string, avatarUrl?: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name,
        avatar_url: avatarUrl,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to create profile:", error);
    return {
      success: false,
      error: error.message || "Failed to create profile",
    };
  }
}

export async function getProfiles() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get profiles:", error);
    return [];
  }
}

export async function deleteProfile(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete profile:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProfile(
  id: string,
  name: string,
  avatarUrl?: string | null
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ name, avatar_url: avatarUrl })
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update profile:", error);
    return { success: false, error: error.message };
  }
}

// Watchlist Actions
export async function addToWatchList(
  profileId: string,
  data: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    releaseDate?: string;
    posterPath: string;
    rating?: number;
    status: WatchStatus;
    totalDuration?: number;
    genres?: string; // JSON string
  }
) {
  try {
    const supabase = await createClient();

    // Check if exists
    const { data: existing } = await supabase
      .from("user_media")
      .select("id")
      .eq("profile_id", profileId)
      .eq("tmdb_id", data.tmdbId)
      .eq("media_type", data.mediaType)
      .single();

    let error;
    if (existing) {
      const { error: err } = await supabase
        .from("user_media")
        .update({
          status: data.status,
          title: data.title,
          release_date: data.releaseDate,
          poster_path: data.posterPath,
          rating: data.rating,
          genres: data.genres,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      error = err;
    } else {
      const { error: err } = await supabase.from("user_media").insert({
        profile_id: profileId,
        tmdb_id: data.tmdbId,
        media_type: data.mediaType,
        title: data.title,
        release_date: data.releaseDate,
        poster_path: data.posterPath,
        rating: data.rating,
        status: data.status,
        total_duration: data.totalDuration,
        genres: data.genres,
      });
      error = err;
    }

    if (error) throw error;

    revalidatePath(`/movies/${data.tmdbId}`);
    revalidatePath(`/tv/${data.tmdbId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add to watchlist:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProgress(
  profileId: string,
  tmdbId: number,
  progress: number
) {
  try {
    const supabase = await createClient();

    // We need to match media item safely. We assume mediaType constraint or just first match if tmdbId is unique enough with profileId (it is, per unique constraint on schema)
    // Schema constraint: unique(profile_id, tmdb_id, media_type). Wait, tmdbId is NOT unique across types?
    // Ah, tmdbId can be same for movie and TV? Yes, rarely but yes.
    // `updateProgress` signature is missing mediaType. This was a flaw in previous implementation too probably.
    // But usually updateProgress comes from player which knows what it is playing.
    // For now I'll try to update whatever matches profileId and tmdbId.

    const { error } = await supabase
      .from("user_media")
      .update({ progress, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId);

    if (error) throw error;

    revalidatePath(`/movies/${tmdbId}`);
    revalidatePath(`/tv/${tmdbId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update progress:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleFavorite(
  profileId: string,
  tmdbId: number,
  isFavorite: boolean
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_media")
      .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId);

    if (error) throw error;

    // Also update vote to 'like' if favoriting, or remove vote if unfavoriting?
    // User asked: "is_favourite acts as a list of things we like (independent of user vote)"
    // BUT also said "create a new column for user vote (liked, disliked)".
    // So keeping them separate is safer.

    revalidatePath(`/movies/${tmdbId}`);
    revalidatePath(`/tv/${tmdbId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle favorite:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleVote(
  profileId: string,
  tmdbId: number,
  vote: "like" | "dislike" | null
) {
  try {
    const supabase = await createClient();

    // We need to ensure the row exists first if we are voting.
    // Assuming the UI calls addToWatchlist (or similar ensure-existence) first, OR we do it here.
    // Let's do a safe update or insert-if-not-exists via upsert if we had all data, but here we might lack title etc.
    // If we assume the item is already tracked (e.g. at least visited), we can try update.
    // BUT, user might vote on a card they haven't "watched" yet.
    // For now, let's assume the caller ensures existence or we just update if exists.
    // Actually, best to update if exists. If not, we can't insert incomplete data easily without fetching TMDB.
    // Let's stick to update for now, and UI should ensure item exists in DB (e.g. by adding to plan_to_watch implicitly).

    const { error } = await supabase
      .from("user_media")
      .update({ vote, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId);

    if (error) throw error;

    revalidatePath(`/movies/${tmdbId}`);
    revalidatePath(`/tv/${tmdbId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle vote:", error);
    return { success: false, error: error.message };
  }
}

export async function removeFromContinueWatching(
  profileId: string,
  tmdbId: number
) {
  try {
    const supabase = await createClient();
    // Don't delete, just reset progress and status
    const { error } = await supabase
      .from("user_media")
      .update({
        status: null,
        progress: 0,
        last_season: 1,
        last_episode: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId);

    if (error) throw error;

    revalidatePath(`/movies/${tmdbId}`);
    revalidatePath(`/tv/${tmdbId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to remove from continue reading:", error);
    return { success: false, error: error.message };
  }
}

export async function removeFromWatchList(profileId: string, tmdbId: number) {
  try {
    const supabase = await createClient();
    // SOFT DELETE: Update status to null, keeps history/vote/favorite
    const { error } = await supabase
      .from("user_media")
      .update({ status: null, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId);

    if (error) throw error;

    revalidatePath(`/movies/${tmdbId}`);
    revalidatePath(`/tv/${tmdbId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to remove from watchlist:", error);
    return { success: false, error: error.message };
  }
}

export async function getWatchStatus(
  profileId: string,
  tmdbId: number,
  mediaType?: "movie" | "tv"
) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("user_media")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId);

    if (mediaType) {
      query = query.eq("media_type", mediaType);
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is no rows
      console.error("Error fetching watch status:", error);
    }

    // Map back to camelCase if needed, or consumers adapt.
    // Consumers expect: isFavorite, status, etc.
    // Supabase returns snake_case by default.
    if (data) {
      return {
        ...data,
        isFavorite: data.is_favorite,
        posterPath: data.poster_path,
        releaseDate: data.release_date,
        mediaType: data.media_type,
        tmdbId: data.tmdb_id,
        totalDuration: data.total_duration,
        lastSeason: data.last_season,
        lastEpisode: data.last_episode,
        vote: data.vote,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to get watch status:", error);
    return null;
  }
}

export async function getWatchList(profileId: string, status?: WatchStatus) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("user_media")
      .select("*")
      .eq("profile_id", profileId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item) => ({
      ...item,
      isFavorite: item.is_favorite,
      posterPath: item.poster_path,
      releaseDate: item.release_date,
      mediaType: item.media_type,
      tmdbId: item.tmdb_id,
      totalDuration: item.total_duration,
      lastSeason: item.last_season,
      lastEpisode: item.last_episode,
      vote: item.vote,
    }));
  } catch (error) {
    console.error("Failed to get watchlist:", error);
    return [];
  }
}

export async function updateEpisodeProgress(
  profileId: string,
  tmdbId: number,
  season: number,
  episode: number,
  progress: number,
  duration: number,
  metadata?: {
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string;
    totalDuration?: number;
    genres?: string;
  }
) {
  try {
    const supabase = await createClient();

    // This relies on the constraint: unique(profile_id, tmdb_id, season_number, episode_number)
    const { error } = await supabase.from("episode_progress").upsert(
      {
        profile_id: profileId,
        tmdb_id: tmdbId,
        season_number: season,
        episode_number: episode,
        progress,
        duration,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "profile_id, tmdb_id, season_number, episode_number",
      }
    );

    if (error) throw error;

    // Also update the main user_media to keep track of "last watched" basically
    // But we don't strictly need to overwrite "progress" there if we don't want to.
    // However, existing "Continue Watching" logic likely relies on user_media.
    // We will update it to point to THIS episode as the last one.
    await incrementProgress(profileId, tmdbId, season, episode, metadata);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update episode progress:", error);
    return { success: false, error: error.message };
  }
}

export async function getEpisodeProgress(profileId: string, tmdbId: number) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("episode_progress")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get episode progress:", error);
    return [];
  }
}

export async function incrementProgress(
  profileId: string,
  tmdbId: number,
  season?: number,
  episode?: number,
  metadata?: {
    mediaType: "movie" | "tv";
    title: string;
    posterPath: string;
    totalDuration?: number;
    genres?: string; // JSON string
  },
  progressValue?: number // Explicit progress in seconds
) {
  try {
    const supabase = await createClient();

    // Check existing
    const { data: existing } = await supabase
      .from("user_media")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId)
      .single();

    if (existing) {
      await supabase
        .from("user_media")
        .update({
          progress:
            progressValue !== undefined
              ? progressValue
              : (existing.progress || 0) + 1,
          total_duration: metadata?.totalDuration ?? existing.total_duration,
          last_season: season ?? existing.last_season,
          last_episode: episode ?? existing.last_episode,
          updated_at: new Date().toISOString(),
          status: "watching",
          genres: metadata?.genres ?? existing.genres,
        })
        .eq("id", existing.id);
    } else if (metadata) {
      await supabase.from("user_media").insert({
        profile_id: profileId,
        tmdb_id: tmdbId,
        media_type: metadata.mediaType,
        title: metadata.title,
        poster_path: metadata.posterPath,
        status: "watching",
        progress: progressValue ?? 1,
        total_duration: metadata.totalDuration,
        last_season: season,
        last_episode: episode,
        genres: metadata.genres,
      });
    }

    revalidatePath(`/movies/${tmdbId}`);
    revalidatePath(`/tv/${tmdbId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to increment progress:", error);
    return { success: false, error: error.message };
  }
}

export async function updateMovieProgress(
  profileId: string,
  tmdbId: number,
  progress: number,
  duration: number,
  metadata?: {
    title: string;
    posterPath: string;
    totalDuration?: number;
    genres?: string;
  }
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("movie_progress").upsert(
      {
        profile_id: profileId,
        tmdb_id: tmdbId,
        progress,
        duration,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "profile_id, tmdb_id",
      }
    );

    if (error) throw error;

    // Also update the main user_media to keep track of "last watched"
    await incrementProgress(
      profileId,
      tmdbId,
      undefined,
      undefined,
      metadata ? { ...metadata, mediaType: "movie" } : undefined,
      progress
    );

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update movie progress:", error);
    return { success: false, error: error.message };
  }
}

export async function getMovieProgress(profileId: string, tmdbId: number) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("movie_progress")
      .select("*")
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }
    return data || null;
  } catch (error) {
    console.error("Failed to get movie progress:", error);
    return null; // Return null on error or not found
  }
}

export async function checkAndCompleteMovie(profileId: string, tmdbId: number) {
  try {
    const supabase = await createClient();

    // 1. Get current movie progress
    const { data: progressData, error: progressError } = await supabase
      .from("movie_progress")
      .select("progress, duration")
      .eq("profile_id", profileId)
      .eq("tmdb_id", tmdbId)
      .single();

    if (progressError && progressError.code !== "PGRST116") {
      throw progressError;
    }

    if (
      !progressData ||
      !progressData.duration ||
      progressData.duration === 0
    ) {
      // No progress data or invalid duration, nothing to do
      return { success: false, message: "No valid progress data" };
    }

    const percentage = progressData.progress / progressData.duration;

    // 2. Check if percentage > 90% (0.9)
    if (percentage > 0.9) {
      // 3. Get current status in user_media to ensure we only update if it's 'watching' (or maybe just force it?)
      // The requirement says: "if ... status watching lo metti con status completed"

      const { data: mediaData, error: mediaError } = await supabase
        .from("user_media")
        .select("status")
        .eq("profile_id", profileId)
        .eq("tmdb_id", tmdbId)
        .single();

      if (mediaError && mediaError.code !== "PGRST116") {
        throw mediaError;
      }

      if (mediaData && mediaData.status === "watching") {
        // Update to completed
        const { error: updateError } = await supabase
          .from("user_media")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("profile_id", profileId)
          .eq("tmdb_id", tmdbId);

        if (updateError) throw updateError;

        revalidatePath(`/movies/${tmdbId}`);
        revalidatePath("/");
        return { success: true, status: "completed" };
      }
    }

    return { success: true, status: "unchanged" };
  } catch (error: any) {
    console.error("Failed to check and complete movie:", error);
    return { success: false, error: error.message };
  }
}
