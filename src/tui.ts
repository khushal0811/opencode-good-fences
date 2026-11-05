import {
  BoxRenderable,
  TextRenderable,
  basenameToFiletype,
  extensionToFiletype,
  infoStringToFiletype,
  type MarkdownCodeBlockRenderer,
} from "@opentui/core"
import { Plugin } from "@opencode/plugin/tui"

// Chat-app-style fenced code blocks: a subtle raised box, a muted
// language label in the top-left, and the default syntax-highlighted code
// inside, with no border.
//
// Registered for every language OpenTUI can normalize (its extension and
// basename maps). The API routes fences by resolved language, so unlabeled
// fences and unknown languages keep the built-in look.

const extraLanguages = [
  "sh",
  "shell",
  "zsh",
  "fish",
  "console",
  "output",
  "text",
  "txt",
  "plaintext",
  "plain",
  "diff",
  "patch",
  "dotenv",
  "env",
  "log",
  "csv",
  "tsv",
  "ini",
  "conf",
  "config",
]

export default Plugin.define({
  id: "good-fences",
  setup(context) {
    const renderer = context.renderer

    const render: MarkdownCodeBlockRenderer = (token, ctx) => {
      const inner = ctx.defaultRender()
      if (!inner) return undefined
      const surface = context.theme.background.raised.base
      try {
        // The default code renderable paints the transcript background;
        // move it onto the raised surface so the box reads as one block.
        ;(inner as unknown as { bg?: unknown }).bg = surface
      } catch {
        // Older renderers may not expose the setter; the box still tints
        // the label and padding rows.
      }
      const box = new BoxRenderable(renderer, {
        width: "100%",
        flexDirection: "column",
        backgroundColor: surface,
        paddingLeft: 2,
        paddingRight: 1,
      })
      const language = (token.lang ?? "").trim()
      if (language) {
        box.add(new TextRenderable(renderer, { content: language, fg: context.theme.text.muted, width: "100%" }))
      }
      box.add(inner)
      return box
    }

    // The host keys renderers by the normalized filetype (e.g. sh/zsh -> bash),
    // so normalize first and register each resolved key exactly once.
    const languages = new Set<string>()
    for (const name of [...extensionToFiletype.values(), ...basenameToFiletype.values(), ...extraLanguages]) {
      const key = infoStringToFiletype(name)
      if (key) languages.add(key)
    }
    const disposers: Array<() => void> = []
    for (const language of languages) {
      try {
        disposers.push(context.markdown.registerCodeBlockRenderer(language, render))
      } catch {
        // Another plugin already owns this language; leave it alone.
      }
    }
    return () => {
      for (const dispose of disposers) dispose()
    }
  },
})
