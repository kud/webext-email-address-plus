import { cp, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const root = fileURLToPath(new URL("..", import.meta.url))

// The shim and fixtures load at runtime (the frame injects the shim as a
// classic script, the shim fetches its fixture), so they travel as files,
// not bundle inputs.
const previewStatics = () => ({
  name: "preview-statics",
  apply: "build",
  async writeBundle() {
    await mkdir(join(root, "preview-dist", "preview", "fixtures"), {
      recursive: true,
    })
    await cp(
      join(root, "preview", "browser-shim.js"),
      join(root, "preview-dist", "preview", "browser-shim.js"),
    )
    await cp(
      join(root, "preview", "fixtures"),
      join(root, "preview-dist", "preview", "fixtures"),
      { recursive: true },
    )
  },
})

// Builds the permanent web demo: the page that frames the real popup and
// options entrypoints, bundled. Uses the project's own vite (via wxt), no
// extra dependencies. preview/ stays out of the extension build and zip.
export default defineConfig({
  root,
  base: "./",
  publicDir: false,
  plugins: [previewStatics()],
  build: {
    outDir: "preview-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        demo: join(root, "preview/index.html"),
        frame: join(root, "preview/frame.html"),
        popup: join(root, "entrypoints/popup/index.html"),
        options: join(root, "entrypoints/options/index.html"),
      },
    },
  },
  server: {
    fs: {
      allow: [root],
    },
  },
})
