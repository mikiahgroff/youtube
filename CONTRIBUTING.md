# Contributing

Thanks for helping. This repo is the source for everything on the
[mikiahgroff](https://www.youtube.com/@mikiahgroff) channel, so a merged pull
request really does change what people see, usually within minutes.

## Suggesting a fix

The quickest way is to use the "Edit on GitHub" link in a video's description or
on its write-up page. GitHub will fork the repo and open a pull request for you.

| To fix... | Edit... |
| --- | --- |
| A typo or error in a description | `videos/<slug>/description.md` |
| A mistake on the write-up page | `videos/<slug>/writeup.md` |
| A wrong chapter time or title | `videos/<slug>/chapters.yaml` |
| Something said wrong in a published video | `corrections` in `videos/<slug>/meta.yaml` |
| A claim in an unfilmed script | `videos/<slug>/script.md` |

A published video can't be edited, so errors in it are recorded as corrections
instead of by changing its script. A correction looks like this, and it shows up in
the YouTube description and on the write-up page:

```yaml
corrections:
  - timestamp: "03:12"   # optional
    text: The limit is 5000 characters, not 500.
    credit: your-github-username   # optional
```

Descriptions are plain text on YouTube, so Markdown won't render there, and `<` and
`>` aren't allowed at all.

When you open a pull request, a check validates your change and a bot posts the
final description for any video you touched. To run the same check yourself, follow
the local setup in the [README](README.md) and run `npm run validate`.

## Draft scripts

Unfilmed scripts are public, and listed on the site's Drafts page, so that mistakes
can be caught while they're cheap to fix. Some things to know first:

- A draft may change completely, or be dropped, so your suggestion might end up
  applying to text that no longer exists.
- I may not respond before I film. Filming doesn't wait for open pull requests, so
  no reply doesn't mean I ignored it.
- Accuracy fixes are the most useful thing you can send. Please don't rewrite the
  script to sound more like you.

## Credit

If your fix is merged and it corrects something, your GitHub username goes in
`contributors` or in the correction's `credit` field, and appears as
"Corrections by @you" in the video's description. Feel free to add it in your pull
request. If you'd rather not be credited, say so and I'll leave it out.

## Licenses

By contributing, you agree that your contribution is licensed the same way as the
part of the repo you're changing: [CC BY 4.0](LICENSE-CONTENT) for writing and media,
and [MIT](LICENSE-CODE) for code.
