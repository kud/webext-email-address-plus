// A fake `browser.*` for running the extension's real popup and options pages
// in an ordinary browser tab. Classic script: it must run before the pages'
// module scripts, which reach the API through @kud/webext's `api` proxy.
//
// Storage lives in sessionStorage, so the popup and options frames of one demo
// share it (and onChanged reaches the other frame), and a new visit starts
// again from fixtures/demo.json. Every address and site is invented.
;(() => {
  const params = new URLSearchParams(location.search)
  const scriptUrl = document.currentScript.src
  const STORE_KEY = "email-address-plus-demo"

  const request = new XMLHttpRequest()
  request.open("GET", new URL("fixtures/demo.json", scriptUrl), false)
  request.send()
  if (request.status !== 200) {
    throw new Error("demo: fixture not found")
  }
  const fixture = JSON.parse(request.responseText)
  const tabUrl = params.get("site") ?? fixture.sites[0]

  const read = () => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return JSON.parse(JSON.stringify(fixture.storage))
  }
  const write = (store) => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {}
  }
  let store = read()
  const listeners = new Set()

  const pick = (keys) => {
    if (keys == null) return { ...store }
    const list =
      typeof keys === "string"
        ? [keys]
        : Array.isArray(keys)
          ? keys
          : Object.keys(keys)
    return Object.fromEntries(
      list.filter((key) => key in store).map((key) => [key, store[key]]),
    )
  }

  const area = {
    get: async (keys) => JSON.parse(JSON.stringify(pick(keys))),
    set: async (patch) => {
      store = read()
      const changes = {}
      for (const [key, value] of Object.entries(patch)) {
        changes[key] = { oldValue: store[key], newValue: value }
        store[key] = JSON.parse(JSON.stringify(value))
      }
      write(store)
      for (const fn of listeners) fn(changes, "local")
    },
  }

  globalThis.browser = {
    runtime: {
      lastError: undefined,
      openOptionsPage: async () => {
        window.parent.postMessage({ demo: "openOptionsPage" }, "*")
      },
      getURL: (path) => path,
    },
    i18n: {
      getMessage: () => "",
    },
    storage: {
      local: area,
      sync: area,
      onChanged: {
        addListener: (fn) => listeners.add(fn),
        removeListener: (fn) => listeners.delete(fn),
      },
    },
    tabs: {
      query: async () => [{ id: 1, active: true, url: tabUrl }],
      sendMessage: async () => undefined,
    },
  }

  // The popup copies on open. Copying is real where the browser allows it and
  // silently skipped where it does not, so the popup still shows its result.
  const realClipboard = navigator.clipboard
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async (text) => {
        try {
          await realClipboard?.writeText(text)
        } catch {}
      },
    },
    configurable: true,
  })

  // The popup closes itself four seconds after opening; in a page that would
  // end the demo, so it stays open.
  window.close = () => {}
})()
