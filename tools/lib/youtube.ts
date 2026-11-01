import { google } from 'googleapis';
import { abs } from './load.ts';

export const SCOPES = ['https://www.googleapis.com/auth/youtube'];

export function loadEnv() {
  try {
    process.loadEnvFile(abs('.env'));
  } catch {
    // No .env file: CI passes these in the environment.
  }
}

export function youtubeClient() {
  const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
  if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) return undefined;
  const auth = new google.auth.OAuth2(YT_CLIENT_ID, YT_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: YT_REFRESH_TOKEN });
  return google.youtube({ version: 'v3', auth });
}
