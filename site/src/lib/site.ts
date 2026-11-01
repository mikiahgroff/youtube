import { getCollection, getEntry } from 'astro:content';
import type { Meta } from '../../../tools/lib/schema.ts';

export async function getChannel() {
  const entry = await getEntry('channel', 'channel');
  if (!entry) throw new Error('channel/channel.yaml did not load');
  return entry.data;
}

export const videosWithStatus = async (...statuses: Meta['status'][]) => {
  const videos = await getCollection('videos', ({ data }) => statuses.includes(data.status));
  return videos.sort((a, b) => (b.data.publish_date ?? '').localeCompare(a.data.publish_date ?? ''));
};

export const path = (to: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${to}`;
