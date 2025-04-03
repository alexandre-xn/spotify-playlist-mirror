import {
  getSourcePlaylistTracks,
  getMirrorPlaylistTracks,
  addTracksToMirrorPlaylist,
  removeTracksFromMirrorPlaylist,
  getRecentlyPlayedTracks
} from './spotify-client';

/**
 * Returns true if the track was added within the last year
 * @param addedAt Date when the track was added
 * @returns Whether the track was added within the last year
 */
function isAddedWithinLastYear(addedAt: Date): boolean {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return addedAt >= oneYearAgo;
}

/**
 * Returns true if the track was played within the last 5 days
 * @param playedAt Date when the track was last played
 * @returns Whether the track was played within the last 5 days
 */
function isPlayedRecentlyWithinLockPeriod(playedAt: Date): boolean {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  return playedAt >= fiveDaysAgo;
}

/**
 * Syncs the mirror playlist to only include tracks added within the last year
 * and preserves the correct ordering by adding oldest tracks first.
 * Excludes recently played tracks (within the last 5 days).
 */
export async function syncMirrorPlaylist(): Promise<void> {
  try {
    console.log('Starting playlist sync...');
    
    // Get tracks from source playlist with their added dates
    const sourceTracks = await getSourcePlaylistTracks();
    console.log(`Found ${sourceTracks.length} tracks in source playlist`);
    
    // Filter tracks that were added within the last year
    const tracksWithinLastYear = sourceTracks.filter(track => 
      isAddedWithinLastYear(track.addedAt)
    );
    console.log(`${tracksWithinLastYear.length} tracks were added within the last year`);

    // Get recently played tracks
    const recentlyPlayedTracks = await getRecentlyPlayedTracks();
    console.log(`Found ${recentlyPlayedTracks.length} recently played tracks`);
    
    // Create a set of recently played track URIs that are still in the lock period (5 days)
    const recentlyPlayedUris = new Set(
      recentlyPlayedTracks
        .filter(track => isPlayedRecentlyWithinLockPeriod(track.playedAt))
        .map(track => track.uri)
    );
    console.log(`${recentlyPlayedUris.size} tracks are in the 5-day lock period`);
    
    // Get current tracks in the mirror playlist
    const mirrorTracks = await getMirrorPlaylistTracks();
    console.log(`Found ${mirrorTracks.length} tracks in mirror playlist`);
    
    // Filter out recently played tracks from those that should be in the mirror playlist
    const eligibleTracks = tracksWithinLastYear.filter(track => 
      !recentlyPlayedUris.has(track.uri)
    );
    console.log(`${eligibleTracks.length} tracks are eligible for the mirror playlist (excluding recently played)`);
    
    // Create sets for easier comparison
    const currentMirrorUris = new Set(mirrorTracks.map(t => t.uri));
    const shouldBeInMirrorUris = new Set(eligibleTracks.map(t => t.uri));
    
    // Check if we need to update the playlist
    const tracksToAdd = eligibleTracks.filter(track => !currentMirrorUris.has(track.uri));
    const tracksToRemove = mirrorTracks.filter(track => !shouldBeInMirrorUris.has(track.uri));
    
    if (tracksToAdd.length > 0 || tracksToRemove.length > 0) {
      console.log('Changes detected, rebuilding mirror playlist with proper order...');
      
      // Remove all tracks first
      const allCurrentUris = mirrorTracks.map(track => track.uri);
      if (allCurrentUris.length > 0) {
        console.log('Removing all existing tracks from mirror playlist');
        await removeTracksFromMirrorPlaylist(allCurrentUris);
      }
      
      // Sort tracks by added date - NEWEST FIRST
      // This way they'll appear in reverse chronological order without needing to sort
      const sortedTracks = [...eligibleTracks].sort((a, b) => 
        b.addedAt.getTime() - a.addedAt.getTime()
      );
      
      console.log('Adding tracks in reverse chronological order (newest first)');
      const urisInOrder = sortedTracks.map(track => track.uri);
      
      // Add in chunks of 100 (Spotify API limit)
      const chunkSize = 100;
      for (let i = 0; i < urisInOrder.length; i += chunkSize) {
        const chunk = urisInOrder.slice(i, i + chunkSize);
        await addTracksToMirrorPlaylist(chunk);
        
        // Log progress for large playlists
        if (i % 100 === 0 || i + chunkSize >= urisInOrder.length) {
          console.log(`Added ${Math.min(i + chunkSize, urisInOrder.length)}/${urisInOrder.length} tracks`);
        }
      }
      
      console.log(`Playlist updated. To see tracks in order from newest to oldest, sort by "Date added" in Spotify.`);
      if (recentlyPlayedUris.size > 0) {
        console.log(`${recentlyPlayedUris.size} recently played tracks were excluded and will be eligible after the 5-day lock period.`);
      }
    } else {
      console.log('No changes needed to mirror playlist');
    }
    
    console.log('Playlist sync completed successfully');
  } catch (error) {
    console.error('Error syncing mirror playlist:', error);
    throw error;
  }
} 