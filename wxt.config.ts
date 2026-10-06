import { defineConfig } from "wxt"

export default defineConfig({
  manifestVersion: 2,
  // Every entrypoint imports what it uses. Auto-imports would also rewrite the
  // bare `browser` global, which the background's isChrome() probe reads.
  imports: false,
  manifest: {
    name: "__MSG_extensionName__",
    description: "__MSG_extensionDescription__",
    default_locale: "en",
    browser_specific_settings: {
      gecko: {
        id: "email-address-plus@kud.io",
        strict_min_version: "142.0",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
    permissions: [
      "activeTab",
      "storage",
      "clipboardWrite",
      "theme",
      "contextMenus",
    ],
    icons: {
      16: "icons/icon.svg",
      32: "icons/icon.svg",
      48: "icons/icon.svg",
    },
    commands: {
      "fill-focused-field": {
        suggested_key: {
          default: "Ctrl+Shift+Y",
          mac: "Command+Shift+Y",
        },
        description: "Fill focused field with labeled email",
      },
    },
  },
  hooks: {
    // WXT takes the toolbar button's title from the popup's <title>, which is
    // page text and cannot be localised; the manifest's title is a locale key.
    "build:manifestGenerated": (_wxt, manifest) => {
      manifest.browser_action = {
        ...manifest.browser_action,
        default_title: "__MSG_extensionAction__",
      }
    },
  },
  vite: () => ({
    build: {
      // Matches strict_min_version, so the minifier leaves color-scheme and
      // the tokens' dark-mode rules as written instead of lowering them.
      cssTarget: "firefox142",
    },
  }),
  zip: {
    excludeSources: ["web-ext-artifacts/**", "preview/**", "preview-dist/**"],
  },
})
