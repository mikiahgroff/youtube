import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { parse } from 'yaml';

// The site's URL lives in channel/channel.yaml so tools and site always agree.
const channel = parse(readFileSync(new URL('../channel/channel.yaml', import.meta.url), 'utf8'));
const { origin, pathname } = new URL(channel.site_url);

const videosDir = fileURLToPath(new URL('../videos', import.meta.url));
const publicVideosDir = fileURLToPath(new URL('./public/videos', import.meta.url));

// videos/<slug>/assets isn't under site/, so dev and build both need a copy under
// public/ to serve it. Rebuilt fresh every run; public/videos/ is gitignored.
function syncVideoAssets() {
  rmSync(publicVideosDir, { recursive: true, force: true });
  for (const entry of readdirSync(videosDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const assetsDir = `${videosDir}/${entry.name}/assets`;
    if (existsSync(assetsDir)) cpSync(assetsDir, `${publicVideosDir}/${entry.name}/assets`, { recursive: true });
  }
}

export default defineConfig({
  site: origin,
  base: pathname,
  trailingSlash: 'always',
  integrations: [{ name: 'sync-video-assets', hooks: { 'astro:config:setup': syncVideoAssets } }],
});
