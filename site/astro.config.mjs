import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import { parse } from 'yaml';

// The site's URL lives in channel/channel.yaml so tools and site always agree.
const channel = parse(readFileSync(new URL('../channel/channel.yaml', import.meta.url), 'utf8'));
const { origin, pathname } = new URL(channel.site_url);

export default defineConfig({
  site: origin,
  base: pathname,
  trailingSlash: 'always',
});
