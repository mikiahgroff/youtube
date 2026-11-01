import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { channelSchema, chaptersSchema, metaSchema } from '../../tools/lib/schema.ts';

const inVideoFolders = (pattern: string) =>
  glob({ pattern, base: '../videos', generateId: ({ entry }) => entry.split('/')[0] });

export const collections = {
  channel: defineCollection({
    loader: glob({ pattern: 'channel.yaml', base: '../channel' }),
    schema: channelSchema,
  }),
  videos: defineCollection({ loader: inVideoFolders('*/meta.yaml'), schema: metaSchema }),
  chapters: defineCollection({ loader: inVideoFolders('*/chapters.yaml'), schema: chaptersSchema }),
  writeups: defineCollection({ loader: inVideoFolders('*/writeup.md') }),
};
