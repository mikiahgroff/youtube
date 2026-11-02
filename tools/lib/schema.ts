import { z } from 'zod';

export const STATUSES = ['idea', 'draft', 'scripted', 'recorded', 'published'] as const;

const githubUser = z
  .string()
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/, 'must be a bare GitHub username, without the @');

const timestamp = z
  .string()
  .regex(/^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/, 'must look like 00:00 or 1:02:03 (quote it in YAML)');

// YAML parsers disagree on whether 2026-11-03 is a string or a Date, so accept both.
const isoDate = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must look like 2026-11-03')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'is not a real date'),
);

export const metaSchema = z
  .strictObject({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case'),
    status: z.enum(STATUSES),
    youtube_id: z
      .string()
      .regex(/^[A-Za-z0-9_-]{11}$/, 'must be the 11-character ID from the video URL')
      .optional(),
    publish_date: isoDate.optional(),
    tags: z.array(z.string().min(1)).default([]),
    contributors: z.array(githubUser).default([]),
    // Placeholder content: never synced to YouTube, and the site shows no player for it.
    sample: z.boolean().optional(),
  })
  .superRefine((meta, ctx) => {
    if (meta.status !== 'published') return;
    for (const field of ['youtube_id', 'publish_date'] as const) {
      if (!meta[field]) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'is required when status is published' });
      }
    }
  });

export const chaptersSchema = z.strictObject({
  chapters: z.array(z.strictObject({ time: timestamp, title: z.string().min(1) })),
});

export const channelSchema = z.strictObject({
  name: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string().min(1)),
  // The one place the site's URL lives. Change this when the custom domain goes live.
  site_url: z.url(),
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/, 'must look like owner/name'),
  contact_email: z.email(),
  links: z.array(z.strictObject({ label: z.string().min(1), url: z.url() })),
});

export type Meta = z.infer<typeof metaSchema>;
export type Chapter = z.infer<typeof chaptersSchema>['chapters'][number];
export type Channel = z.infer<typeof channelSchema>;
