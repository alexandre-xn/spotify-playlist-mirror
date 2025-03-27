import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';

dotenv.config();

// Required environment variables
const requiredEnvVars = [
  'CLIENT_ID',
  'CLIENT_SECRET',
  'REFRESH_TOKEN',
  'USER_ID'
];

// Check for required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize the Spotify client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN
});

// Token expiration management
let tokenExpirationTime = 0; // Unix timestamp when the token expires

/**
 * Ensures that the Spotify client has a valid access token
 */
export async function ensureAccessToken(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  
  // Check if token is still valid (with 60 seconds buffer)
  if (tokenExpirationTime > now + 60) {
    return; // Token is still valid
  }
  
  try {
    const data = await spotifyApi.refreshAccessToken();
    spotifyApi.setAccessToken(data.body.access_token);
    
    // Calculate expiration time (tokens typically last 3600 seconds/1 hour)
    // Adding a 5-minute buffer to be safe
    const expiresIn = data.body.expires_in || 3600;
    tokenExpirationTime = now + expiresIn - 300;
    
    console.log('Access token refreshed successfully, valid for', expiresIn, 'seconds');
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Gets track information from the source playlist with added dates
 * @returns Array of track objects with track info and added dates
 */
export async function getSourcePlaylistTracks(): Promise<Array<{
  addedAt: Date;
  track: SpotifyApi.TrackObjectFull;
  uri: string;
}>> {
  await ensureAccessToken();
  
  const sourcePlaylistId = process.env.SOURCE_PLAYLIST_ID;
  if (!sourcePlaylistId) {
    throw new Error('SOURCE_PLAYLIST_ID environment variable not set');
  }

  const tracks: Array<{
    addedAt: Date;
    track: SpotifyApi.TrackObjectFull;
    uri: string;
  }> = [];
  
  // Spotify API returns paginated results, so we need to fetch all pages
  let offset = 0;
  const limit = 100;
  let hasMoreTracks = true;

  while (hasMoreTracks) {
    const response = await spotifyApi.getPlaylistTracks(sourcePlaylistId, {
      offset,
      limit,
      fields: 'items(added_at,track(id,uri,name,artists)),next'
    });

    const items = response.body.items;
    
    for (const item of items) {
      if (item.track) {
        tracks.push({
          addedAt: new Date(item.added_at),
          track: item.track,
          uri: item.track.uri
        });
      }
    }

    offset += limit;
    hasMoreTracks = items.length === limit;
  }

  return tracks;
}

/**
 * Gets tracks from the mirror playlist
 * @returns Array of track URIs in the mirror playlist
 */
export async function getMirrorPlaylistTracks(): Promise<Array<{
  uri: string;
  position: number;
}>> {
  await ensureAccessToken();
  
  const mirrorPlaylistId = process.env.MIRROR_PLAYLIST_ID;
  if (!mirrorPlaylistId) {
    throw new Error('MIRROR_PLAYLIST_ID environment variable not set');
  }

  const tracks: Array<{
    uri: string;
    position: number;
  }> = [];
  
  let offset = 0;
  const limit = 100;
  let hasMoreTracks = true;

  while (hasMoreTracks) {
    const response = await spotifyApi.getPlaylistTracks(mirrorPlaylistId, {
      offset,
      limit,
      fields: 'items(track(uri)),next'
    });

    const items = response.body.items;
    
    for (let i = 0; i < items.length; i++) {
      const track = items[i].track;
      if (track && track.uri) {
        tracks.push({
          uri: track.uri,
          position: offset + i
        });
      }
    }

    offset += limit;
    hasMoreTracks = items.length === limit;
  }

  return tracks;
}

/**
 * Adds tracks to the mirror playlist
 * @param trackUris URIs of tracks to add
 * @param position Position to add the tracks
 */
export async function addTracksToMirrorPlaylist(trackUris: string[], position?: number): Promise<void> {
  if (trackUris.length === 0) return;
  
  await ensureAccessToken();
  
  const mirrorPlaylistId = process.env.MIRROR_PLAYLIST_ID;
  if (!mirrorPlaylistId) {
    throw new Error('MIRROR_PLAYLIST_ID environment variable not set');
  }

  // Spotify API has a limit of 100 tracks per request
  const chunkSize = 100;
  for (let i = 0; i < trackUris.length; i += chunkSize) {
    const chunk = trackUris.slice(i, i + chunkSize);
    await spotifyApi.addTracksToPlaylist(
      mirrorPlaylistId,
      chunk,
      { position: position !== undefined ? position + i : undefined }
    );
  }
}

/**
 * Removes tracks from the mirror playlist
 * @param trackUris URIs of tracks to remove
 */
export async function removeTracksFromMirrorPlaylist(trackUris: string[]): Promise<void> {
  if (trackUris.length === 0) return;
  
  await ensureAccessToken();
  
  const mirrorPlaylistId = process.env.MIRROR_PLAYLIST_ID;
  if (!mirrorPlaylistId) {
    throw new Error('MIRROR_PLAYLIST_ID environment variable not set');
  }

  // Convert track URIs to the format expected by the API
  const tracks = trackUris.map(uri => ({ uri }));

  // Spotify API has a limit of 100 tracks per request
  const chunkSize = 100;
  for (let i = 0; i < tracks.length; i += chunkSize) {
    const chunk = tracks.slice(i, i + chunkSize);
    await spotifyApi.removeTracksFromPlaylist(mirrorPlaylistId, chunk);
  }
}

export default spotifyApi; 