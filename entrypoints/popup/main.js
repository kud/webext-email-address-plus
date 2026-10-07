import { api, invoke } from "@kud/webext"
import "@kud/webext-ui/tokens.css"
import "@kud/webext-ui/webext-ui.css"
import "../../assets/theme.css"
import "./tooltip.css"
import { settings } from "../../utils/settings"

const ICONS = {
  check:
    '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  copy: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"/></svg>',
  alert:
    '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M8 4.5v4.5"/><circle cx="8" cy="11.75" r=".5" fill="currentColor"/></svg>',
}

const setTitle = (tone, text) => {
  const title = document.getElementById("card-title")
  title.textContent = ""
  const icon = document.createElement("span")
  icon.className = "title-icon"
  icon.dataset.tone = tone
  icon.innerHTML = tone === "success" ? ICONS.check : ICONS.alert
  title.append(icon, document.createTextNode(text))
}

// alex+example.com@example.org renders with the label on a tint, because the
// label is the point of the extension. Built with nodes so an address never
// parses as markup.
const appendTaggedAddress = (parent, address) => {
  const at = address.lastIndexOf("@")
  const plus = address.indexOf("+")
  if (plus < 0 || plus > at) {
    parent.append(document.createTextNode(address))
    return
  }
  parent.append(document.createTextNode(address.slice(0, plus)))
  const mark = document.createElement("mark")
  mark.className = "plus-tag"
  mark.textContent = address.slice(plus, at)
  parent.append(mark)
  parent.append(document.createTextNode(address.slice(at)))
}

const copyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textArea = document.createElement("textarea")
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand("copy")
  document.body.removeChild(textArea)
}

;(async function () {
  const subtitle = document.getElementById("card-subtitle")

  if (!subtitle) {
    console.error("Required DOM elements not found")
    return
  }

  let email = ""
  let domainMode = "main"
  let hostname = ""

  try {
    const prefs = await settings.get()
    email = prefs.email.trim()
    domainMode = prefs.domainMode

    const tabs = await invoke(api.tabs, "query", {
      active: true,
      currentWindow: true,
    })
    if (tabs?.[0]?.url) {
      try {
        const url = new URL(tabs[0].url)
        hostname = url.hostname
        if (
          url.protocol === "chrome:" ||
          url.protocol === "about:" ||
          url.protocol === "moz-extension:" ||
          url.protocol === "chrome-extension:"
        ) {
          hostname = ""
        }
      } catch (e) {
        console.warn("Invalid URL:", tabs[0].url, e.message)
        hostname = ""
      }
    }
  } catch (e) {
    console.error("Failed to get storage or tab data:", e)
    email = ""
  }

  const isValidEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) && value.includes("@")
  }

  const generateLabel = (host, mode) => {
    if (!host) return ""

    const hostnameArr = host.split(".")
    let label = host

    switch (mode) {
      case "main":
        if (hostnameArr.length >= 2) {
          if (
            hostnameArr.length >= 3 &&
            (hostnameArr[hostnameArr.length - 2] === "co" ||
              hostnameArr[hostnameArr.length - 2] === "com" ||
              hostnameArr[hostnameArr.length - 2] === "org" ||
              hostnameArr[hostnameArr.length - 2] === "net" ||
              hostnameArr[hostnameArr.length - 2] === "gov" ||
              hostnameArr[hostnameArr.length - 2] === "edu" ||
              hostnameArr[hostnameArr.length - 2] === "ac")
          ) {
            label = hostnameArr.slice(-3).join(".")
          } else {
            label = hostnameArr.slice(-2).join(".")
          }
        }
        break
      case "short":
        if (hostnameArr.length >= 2) {
          label = hostnameArr[hostnameArr.length - 2]
        }
        break
      case "full":
      default:
        label = host
        break
    }

    return label.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()
  }

  const MAX_HISTORY_ITEMS = 3

  const saveEmailToHistory = async (emailAddress) => {
    try {
      let history = (await settings.get()).emailHistory
      history = history.filter((item) => item !== emailAddress)
      history.unshift(emailAddress)
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS)
      }
      await settings.set({ emailHistory: history })
    } catch (error) {
      console.error("Failed to save email to history:", error)
    }
  }

  const renderEmailHistory = async () => {
    try {
      const { emailHistory: history, showHistory } = await settings.get()

      const historySection = document.getElementById("history-section")
      const historyList = document.getElementById("history-list")

      if (!showHistory || history.length === 0) {
        historySection.hidden = true
        return
      }

      historyList.textContent = ""

      history.forEach((address) => {
        const item = document.createElement("button")
        item.type = "button"
        item.className = "row-bleed history-item"
        item.setAttribute("aria-label", `Copy ${address}`)
        item.dataset.address = address

        const emailSpan = document.createElement("span")
        emailSpan.className = "history-email"
        appendTaggedAddress(emailSpan, address)

        const action = document.createElement("span")
        action.className = "history-action"
        action.setAttribute("aria-live", "polite")
        action.innerHTML = ICONS.copy

        item.append(emailSpan, action)
        item.addEventListener("click", async () => {
          try {
            await copyText(item.dataset.address)
            item.classList.add("is-copied")
            action.innerHTML = `${ICONS.check}<span>Copied</span>`
            setTimeout(() => {
              item.classList.remove("is-copied")
              action.innerHTML = ICONS.copy
            }, 1000)
          } catch (e) {
            console.error("Failed to copy from history:", e)
          }
        })

        historyList.appendChild(item)
      })

      historySection.hidden = false
    } catch (error) {
      console.error("Failed to render email history:", error)
    }
  }

  const showSuccessAnimation = (labeledEmail) => {
    saveEmailToHistory(labeledEmail)

    setTimeout(() => {
      setTitle("success", "Email address copied")
      subtitle.className = "address"
      subtitle.textContent = ""
      appendTaggedAddress(subtitle, labeledEmail)
    }, 200)
  }

  const showError = (heading, withSettingsButton) => {
    setTitle("danger", heading)
    subtitle.className = "status"
    subtitle.textContent = "Set it in Settings, then open the popup again."
    if (withSettingsButton) {
      const openSettings = document.createElement("button")
      openSettings.type = "button"
      openSettings.className = "btn btn-primary btn-block"
      openSettings.textContent = "Open settings"
      openSettings.addEventListener("click", () => {
        api.runtime.openOptionsPage()
      })
      subtitle.after(openSettings)
    }
  }

  if (!email) {
    showError("Email address missing", true)
  } else if (!isValidEmail(email)) {
    showError("Invalid email format", true)
  } else {
    let labeledEmail = email
    if (hostname) {
      const atIndex = email.lastIndexOf("@")
      if (atIndex > 0) {
        const preEmail = email.substring(0, atIndex)
        const postEmail = email.substring(atIndex + 1)
        const label = generateLabel(hostname, domainMode)
        if (label) {
          labeledEmail = `${preEmail}+${label}@${postEmail}`
        }
      }
    }

    try {
      await copyText(labeledEmail)
      showSuccessAnimation(labeledEmail)
    } catch (e) {
      console.error("Failed to copy to clipboard:", e)
      setTitle("danger", "Copy failed")
      subtitle.className = "status"
      subtitle.textContent = ""
      appendTaggedAddress(subtitle, labeledEmail)
    }
  }

  const settingsBtn = document.getElementById("settings-btn")
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      api.runtime.openOptionsPage()
    })
  }

  renderEmailHistory()

  // Auto-close after 4s, paused while the pointer or keyboard focus is inside
  // the popup so a Recent row stays reachable. Focus counts only when it is
  // :focus-visible, so a mouse click does not hold the popup open. This timer
  // is the single source of truth and drives the drain bar itself; resuming
  // needs both flags clear, and a window blur clears the focus one, since
  // leaving the window fires no focusout.
  const AUTO_CLOSE_MS = 4000
  const bar = document.querySelector(".autoclose span")
  let closeTimer = null
  let closeStartedAt = 0
  let remaining = AUTO_CLOSE_MS
  let pointerInside = false
  let focusInside = false
  let barAnimation = null

  const startBar = (ms) => {
    if (!bar) return
    barAnimation?.cancel()
    barAnimation = bar.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { duration: ms, easing: "linear", fill: "forwards" },
    )
  }

  const fireClose = () => {
    closeTimer = null
    remaining = 0
    window.close()
  }

  const scheduleClose = (ms) => {
    clearTimeout(closeTimer)
    closeStartedAt = Date.now()
    remaining = ms
    startBar(ms)
    closeTimer = setTimeout(fireClose, ms)
  }

  const pauseClose = () => {
    if (!closeTimer) return
    clearTimeout(closeTimer)
    closeTimer = null
    remaining = Math.max(remaining - (Date.now() - closeStartedAt), 0)
    barAnimation?.pause()
  }

  const resumeClose = () => {
    if (closeTimer) return
    closeStartedAt = Date.now()
    barAnimation?.play()
    closeTimer = setTimeout(fireClose, Math.max(remaining, 0))
  }

  const updateCloseState = () => {
    if (pointerInside || focusInside) {
      pauseClose()
    } else {
      resumeClose()
    }
  }

  document.documentElement.addEventListener("pointerenter", () => {
    pointerInside = true
    updateCloseState()
  })
  document.documentElement.addEventListener("pointerleave", () => {
    pointerInside = false
    updateCloseState()
  })
  document.addEventListener("focusin", (event) => {
    focusInside = event.target.matches(":focus-visible")
    updateCloseState()
  })
  document.addEventListener("focusout", (event) => {
    focusInside = Boolean(
      event.relatedTarget instanceof Element &&
        document.contains(event.relatedTarget) &&
        event.relatedTarget.matches(":focus-visible"),
    )
    updateCloseState()
  })
  window.addEventListener("blur", () => {
    focusInside = false
    updateCloseState()
  })
  scheduleClose(AUTO_CLOSE_MS)
})()
