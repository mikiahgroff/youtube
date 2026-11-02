# youtube

The public source of truth for the [mikiahgroff](https://www.youtube.com/@mikiahgroff)
YouTube channel. Video descriptions, scripts, write-ups and channel details all live
here, and anyone can open a pull request to correct them, including scripts I haven't
filmed yet. See [CONTRIBUTING.md](CONTRIBUTING.md).

Site: <https://mikiahgroff.github.io/youtube/>

Unannounced ideas and sponsor material live in a separate private repo,
`youtube-workspace`. Nothing here should be secret.

## How it works

```
channel/                    channel.yaml
videos/<slug>/              meta.yaml, script.md, description.md, chapters.yaml, writeup.md, assets/
site/                       Astro site, reads channel/ and videos/
tools/                      TypeScript CLI: validate, build-description, sync, auth
.github/workflows/          the automation below
```

| Event | Workflow | What happens |
| --- | --- | --- |
| Pull request | `validate.yml` | Validates everything, runs tests, builds the site |
| Validate finished | `pr-preview-comment.yml` | Posts the built description for changed videos as a PR comment |
| Push to `main` | `sync-youtube.yml` | Updates YouTube for real, if `YOUTUBE_SYNC` is on |
| Push to `main` | `deploy-site.yml` | Deploys the site to GitHub Pages |

**Merging to `main` publishes.** Once sync is on, a merged change goes to YouTube
straight away, and merging `status: published` makes the video public. Review pull
requests with that in mind.

Each video has a `status` in `meta.yaml`. The status decides which files must exist
and where the video appears:

| Status | Required files | Appears on |
| --- | --- | --- |
| `idea` | `meta.yaml` | Nowhere |
| `draft`, `scripted` | + `script.md` | `/drafts/` |
| `recorded` | + `description.md`, `chapters.yaml` | Nowhere |
| `published` | + `writeup.md`, and `youtube_id` and `publish_date` in `meta.yaml` | Homepage and `/videos/<slug>/` |

`recorded` is optional. It's for a video that's filmed but not ready to release.

The description on YouTube is assembled from `description.md`, chapters, credits
and a standard footer. Sync only touches videos with a `youtube_id`, and only
their title, description and tags, plus visibility the first time a video is
released. Category, language and everything else are kept.

The two videos marked `sample: true` are placeholder data. Sync never sends them to
YouTube. Delete both folders once a real video exists.

To move the site to a custom domain, change `site_url` in `channel/channel.yaml`, the
only place the build reads it from, and add the domain under **Settings > Pages >
Custom domain**. Then update the site link at the top of this file.

## Publishing a video

Git is how a video gets published, in two pull requests. Don't schedule videos or make
them public in YouTube Studio.

**PR 1: Script.** Add `videos/<slug>/` with `meta.yaml` (`status: scripted`) and
`script.md`. Once merged, it's listed on `/drafts/` and viewers can send fixes. Pick the
slug with care: it becomes the video's URL, and it can't change after release.

**PR 2: Publish.** Do this when the video is ready to go out:

1. Upload the video in YouTube Studio as **private**, which gives you its ID.
2. Open a PR setting `status: published`, `youtube_id` and `publish_date`, with
   `description.md`, `chapters.yaml` and `writeup.md`.
3. Check the description preview the bot posts, then merge.

The merge is the release. Sync sets the title, description and tags and makes the video
public in one call, subscribers are notified, and the site page goes live. If sync
fails, the video stays private. Fix the cause and re-run the workflow.

If a video doesn't need viewer review, skip PR 1. After release, fixes go in
`writeup.md`.

Sync makes each video public once and never changes its visibility again, so to pull a
video, set it to private in YouTube Studio and it stays that way. To remove its site
page too, change `status` to `recorded`. To bring it back, make it public in Studio.

## Local setup

You need Node 22.23.4 or newer and [Git LFS](https://git-lfs.com). Images are stored
in LFS, so install it before cloning, or run `git lfs pull` afterwards.

```bash
git lfs install
```

```bash
git clone https://github.com/mikiahgroff/youtube.git
```

```bash
npm install
```

| Command | What it does |
| --- | --- |
| `npm run validate` | Checks every video and the channel against schemas and YouTube's limits |
| `npm run preview -- <slug>` | Prints the final description for a video |
| `npm run sync` | Dry run: shows what would change on YouTube |
| `npm run sync -- --apply` | Writes to YouTube. CI does this, you rarely should |
| `npm run auth` | One-time OAuth flow, prints a refresh token |
| `npm test` | Runs the unit tests |
| `npm run typecheck` | Type-checks `tools/` |
| `npm run site:dev` | Runs the site at <http://localhost:4321/youtube/> |
| `npm run site:build` | Builds the site into `site/dist/` |
| `npm run site:preview` | Serves the built site |

Without credentials, a dry run can't compare against the live channel, so it only
lists what it would touch. Put them in `.env` (see `.env.example`) to get a real diff.

## YouTube OAuth credentials

You only need to do this once.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a
   project, for example `mikiahgroff-youtube`.
2. Go to **APIs & Services > Library**, find **YouTube Data API v3**, and click
   **Enable**.
3. Go to **Google Auth Platform** (also labelled **OAuth consent screen**). Choose
   **External**, then fill in the app name and your email.
4. Under **Audience**, click **Publish app** so its status is **In production**. Do
   not skip this: in **Testing**, refresh tokens expire after 7 days and sync starts
   failing. The app stays unverified, which is fine for your own use.
5. Under **Clients**, create a client of type **Desktop app**, then copy its client ID
   and secret.
6. Copy `.env.example` to `.env` and fill in `YT_CLIENT_ID` and `YT_CLIENT_SECRET`.
7. Run `npm run auth` and open the URL it prints. Sign in as the account that owns the
   channel, and pick the channel itself if Google asks. You'll see a "Google hasn't
   verified this app" warning: choose **Advanced**, then continue. Because it's your
   own app, that's expected.
8. The refresh token prints in the terminal. Add it to `.env` as `YT_REFRESH_TOKEN`.
9. Run `npm run sync` and read the diff.

A refresh token stops working if it goes unused for 6 months or you revoke the app's
access. If sync starts failing with `invalid_grant`, repeat steps 7 and 8, and update
the secret.

## GitHub settings

Under **Settings > Secrets and variables > Actions**:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `YT_CLIENT_ID` | From step 5 |
| Secret | `YT_CLIENT_SECRET` | From step 5 |
| Secret | `YT_REFRESH_TOKEN` | From step 8 |
| Variable | `YOUTUBE_SYNC` | `on`, once you're ready for real sync |

Until `YOUTUBE_SYNC` is `on`, the sync workflow is skipped and nothing touches
YouTube. The first real sync overwrites the channel description and keywords, so
replace the placeholders first.

Under **Settings > Pages**, set **Source** to **GitHub Actions**.

## Channel details

Sync manages the channel description and keywords from `channel/channel.yaml`. The
banner and avatar aren't managed here, so change them in YouTube Studio and sync leaves
them alone.

`channel/.sync-state.json` records which videos have been released, and CI commits it
back to `main`.

## Licenses

- Writing and media (`channel/`, `videos/`, and documentation):
  [CC BY 4.0](LICENSE-CONTENT). Reuse it with attribution to Mikiah Groff.
- Code (`tools/`, `site/`, `.github/`): [MIT](LICENSE-CODE).

The videos themselves are on YouTube and aren't covered by these licenses unless they
say so.
