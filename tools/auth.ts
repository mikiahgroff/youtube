import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { google } from 'googleapis';
import { loadEnv, SCOPES } from './lib/youtube.ts';

loadEnv();
const { YT_CLIENT_ID, YT_CLIENT_SECRET } = process.env;
if (!YT_CLIENT_ID || !YT_CLIENT_SECRET) {
  console.error('Set YT_CLIENT_ID and YT_CLIENT_SECRET in .env first. The README explains where they come from.');
  process.exit(1);
}

const state = randomBytes(16).toString('hex');

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (url.pathname !== '/') {
    response.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get('code');
  if (url.searchParams.get('state') !== state || !code) {
    response.writeHead(400).end('Authorization failed. Check the terminal.');
    console.error(`Authorization failed: ${url.searchParams.get('error') ?? 'state mismatch'}`);
    process.exit(1);
  }
  const { address, port } = server.address() as AddressInfo;
  const client = new google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET, `http://${address}:${port}`);
  const { tokens } = await client.getToken(code);
  response.end('Done. You can close this tab and go back to the terminal.');
  if (!tokens.refresh_token) {
    console.error('Google returned no refresh token. Revoke this app at myaccount.google.com/permissions and try again.');
    process.exit(1);
  }
  console.log(`\nYT_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  console.log('Put this in .env and in the YT_REFRESH_TOKEN GitHub secret. Treat it like a password.');
  process.exit(0);
});

server.listen(0, '127.0.0.1', () => {
  const { address, port } = server.address() as AddressInfo;
  const client = new google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET, `http://${address}:${port}`);
  const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES, state });
  console.log('Open this URL and sign in as the account that owns the channel:\n');
  console.log(url);
  console.log('\nWaiting for the redirect...');
});
