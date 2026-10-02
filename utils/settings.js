import { defineSettings } from "@kud/webext"

/**
 * The one declaration of what Email Address Plus persists.
 *
 * Imported by the background script, the popup, the options page and the
 * content script. Every read used to re-derive its own default at the call site
 * (`showHistory !== false`, `domainMode || "main"`), which is four idioms for
 * one fact and cannot express a default of `false` at all.
 */
export const settings = defineSettings(
  {
    email: "",
    domainMode: "main",
    showHistory: true,
    showFloatingIcon: true,
    emailHistory: [],
  },
  { area: "local" },
)
