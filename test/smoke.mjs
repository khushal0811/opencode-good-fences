// Smoke test for the built plugin. Run `npm run build` first, then `npm test`.
import { createTestRenderer } from "@opentui/core/testing"
import { createMarkdownCodeBlockRenderer, MarkdownRenderable, RGBA, SyntaxStyle } from "@opentui/core"
import plugin from "../dist/tui.js"

const checks = []
function check(name, ok) {
  checks.push(ok)
  console.log((ok ? "ok  " : "FAIL") + "  " + name)
}

check("id is good-fences", plugin.id === "good-fences")

const setup = await createTestRenderer({ width: 60, height: 12 })

const registry = {}
const context = {
  options: {},
  renderer: setup.renderer,
  theme: {
    background: { raised: { base: RGBA.fromHex("#30302c") } },
    text: { muted: RGBA.fromHex("#b2afa4") },
  },
  markdown: {
    registerCodeBlockRenderer(language, render) {
      if (registry[language]) throw new Error("duplicate registration: " + language)
      registry[language] = render
      return () => {
        delete registry[language]
      }
    },
  },
}

const cleanup = plugin.setup(context)
check("registers many languages", Object.keys(registry).length > 50)
check("registers typescript", Boolean(registry["typescript"]))
check("registers bash", Boolean(registry["bash"]))

const syntax = SyntaxStyle.fromStyles({ default: { fg: RGBA.fromHex("#f5f4ee") } }, setup.renderer.nativeScene)
const markdown = new MarkdownRenderable(setup.renderer, {
  width: 60,
  content: 'hi\n\n```ts\nconst x = 1\n```\n',
  syntaxStyle: syntax,
  conceal: true,
  bg: RGBA.fromHex("#262623"),
  renderNode: createMarkdownCodeBlockRenderer(registry),
})
setup.renderer.root.add(markdown)
await setup.renderOnce()
await setup.flush()
await setup.renderOnce()

const frame = setup.captureCharFrame()
check("frame shows the language label", frame.includes("ts"))
check("frame shows the code", frame.includes("const x = 1"))

cleanup()
check("cleanup unregisters", Object.keys(registry).length === 0)
await setup.dispose()

process.exitCode = checks.every(Boolean) ? 0 : 1
