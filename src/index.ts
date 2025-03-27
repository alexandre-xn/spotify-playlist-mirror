import cron from 'node-cron';
import dotenv from 'dotenv';
import { syncMirrorPlaylist } from './playlist-sync';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'CLIENT_ID', 
  'CLIENT_SECRET', 
  'REFRESH_TOKEN', 
  'SOURCE_PLAYLIST_ID', 
  'MIRROR_PLAYLIST_ID', 
  'USER_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Missing required environment variable ${envVar}`);
    process.exit(1);
  }
}

// Log startup message
console.log('Starting Spotify Playlist Mirror');
console.log(`Source playlist: ${process.env.SOURCE_PLAYLIST_ID}`);
console.log(`Mirror playlist: ${process.env.MIRROR_PLAYLIST_ID}`);

// Run the sync immediately at startup
console.log('Running initial playlist sync...');
syncMirrorPlaylist()
  .then(() => {
    console.log('Initial sync completed successfully');
  })
  .catch(error => {
    console.error('Error during initial sync:', error);
  });

// Schedule the sync to run every 30 minutes
// Cron expression: "*/30 * * * *" = every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log(`\nScheduled sync triggered at ${new Date().toISOString()}`);
  
  try {
    await syncMirrorPlaylist();
    console.log('Scheduled sync completed successfully');
  } catch (error) {
    console.error('Error during scheduled sync:', error);
  }
});

console.log('Sync scheduled to run every 30 minutes');

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
}); 