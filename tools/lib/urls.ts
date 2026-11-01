import type { Channel } from './schema.ts';

const BRANCH = 'main';

export const githubEditUrl = (channel: Channel, path: string) =>
  `https://github.com/${channel.repo}/edit/${BRANCH}/${path}`;

export const githubBlobUrl = (channel: Channel, path: string) =>
  `https://github.com/${channel.repo}/blob/${BRANCH}/${path}`;

export const videoPageUrl = (channel: Channel, slug: string) =>
  `${channel.site_url.replace(/\/$/, '')}/videos/${slug}/`;
