# Spotify Playlist Mirror

This script creates and maintains a mirror of a Spotify playlist that only contains tracks added within the last year.

## Setup

1. Create a Spotify Developer account at [developer.spotify.com](https://developer.spotify.com)
2. Create a new app in the Spotify Developer Dashboard
3. Add a redirect URI (e.g., `http://localhost:8888/callback`)
4. Note your Client ID and Client Secret
5. Install dependencies: `npm install`
6. Update `.env` file with your Spotify credentials:
   - CLIENT_ID: Your Spotify app client ID
   - CLIENT_SECRET: Your Spotify app client secret
   - SOURCE_PLAYLIST_ID: The ID of your source playlist
   - MIRROR_PLAYLIST_ID: The ID of your mirror playlist (create an empty playlist and use its ID)
   - USER_ID: Your Spotify user ID
   - REFRESH_TOKEN: A long-lived refresh token (see below)

## Getting a Refresh Token

Since this script runs server-side, you'll need to get a refresh token with the appropriate scopes:

1. Run the auth script: `npm run auth`
2. Log in to Spotify in the browser window that opens
3. Copy the refresh token from the console output
4. Add it to your `.env` file

## Running the script

- Development: `npm run dev`
- Production: `npm run start`

The script will run every 30 minutes and update the mirror playlist.

## Features

- Syncs a mirror playlist with tracks from the source playlist
- Only includes tracks added within the last year
- Preserves the original playlist order
- Runs every 30 minutes automatically 