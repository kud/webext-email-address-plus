// A fake `browser.*` for running the extension's real popup and options pages
// in an ordinary browser tab. Classic script: it must run before the pages'
// module scripts, which reach the API through @kud/webext's `api` proxy.
//
// ?fixture=<name> picks the data from fixtures/<name>.json. Every address and
// site is invented. State lives in memory; writes apply in memory and are
// logged, nothing else.
;(() => {
  const params = new URLSearchParams(location.search)
  const name = params.get("fixture") ?? "typical"
  const scriptUrl = document.currentScript.src

  const request = new XMLHttpRequest()
  request.open("GET", new URL(`fixtures/${name}.json`, scriptUrl), false)
  request.send()
  if (request.status !== 200) {
    throw new Error(`preview: no fixture "${name}"`)
  }
  const fixture = JSON.parse(request.responseText)
  const store = JSON.parse(JSON.stringify(fixture.storage ?? {}))
  const listeners = new Set()

  const log = (call, detail) =>
    console.info(
      "[preview]",
      call,
      detail === undefined ? "" : JSON.stringify(detail),
    )

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
      log("storage.set", patch)
      const changes = {}
      for (const [key, value] of Object.entries(patch)) {
        changes[key] = { oldValue: store[key], newValue: value }
        store[key] = JSON.parse(JSON.stringify(value))
      }
      for (const fn of listeners) fn(changes, "local")
    },
  }

  globalThis.browser = {
    runtime: {
      lastError: undefined,
      openOptionsPage: async () => {
        log("runtime.openOptionsPage")
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
      query: async () => [{ id: 1, active: true, url: fixture.tabUrl }],
      sendMessage: async () => undefined,
    },
  }

  // The popup copies on open and closes itself after 4s; neither may touch
  // the host page or end the preview.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async () => {} },
    configurable: true,
  })
  window.close = () => {}
})()
