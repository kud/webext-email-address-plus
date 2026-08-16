/**
 * The one declaration of what Email Address Plus persists.
 *
 * Loaded as a classic script by the background page, the tooltip popup, the
 * options page and the content script, none of which can share an ES module — a
 * manifest content script is not a module, so an `import` is a syntax error
 * there, and a background script declared via "background.scripts" is classic
 * too. Every read used to re-derive its own default at the call site
 * (`showHistory !== false`, `domainMode || "main"`), which is four idioms for
 * one fact and cannot express a default of `false` at all.
 */
const settings = webext.defineSettings(
  {
    email: "",
    domainMode: "main",
    showHistory: true,
    showFloatingIcon: true,
    emailHistory: [],
  },
  { area: "local" },
)
