import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';
import http from 'http';
import { URL } from 'url';

dotenv.config();

const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-private',
  'user-read-email',
  'user-read-recently-played'
];

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

const authorizeURL = spotifyApi.createAuthorizeURL(SCOPES, 'state');
console.log('Please visit the following URL to authorize the application:');
console.log(authorizeURL);

// Open the URL in the default browser
require('child_process').exec(`start ${authorizeURL}`);

const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith('/callback')) {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      
      if (!code) {
        throw new Error('No code provided');
      }

      // Exchange the code for tokens
      const data = await spotifyApi.authorizationCodeGrant(code);
      const { access_token, refresh_token } = data.body;

      // Output the tokens
      console.log('\nAuthentication successful!');
      console.log('Access Token:', access_token);
      console.log('\nRefresh Token (add this to your .env file):', refresh_token);
      
      // Send a response to the browser
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>Authentication Successful!</h1>
        <p>You can close this window and check the console for your refresh token.</p>
        <p>Add the refresh token to your .env file.</p>
      `);

      // Close the server after a short delay
      setTimeout(() => {
        server.close();
        console.log('\nServer closed. You can now close this terminal window.');
      }, 2000);
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>Error</h1><p>Authentication failed. Check the console for details.</p>');
  }
});

server.listen(PORT, () => {
  console.log(`Listening for the authorization callback on port ${PORT}`);
}); 