import { api } from "@kud/webext"
import { defineBackground } from "wxt/utils/define-background"
import { settings } from "../utils/settings"

// `api` resolves the namespace but deliberately erases which one it
// resolved to, and openPopup below is the one place that difference matters:
// it is callable from a browserAction click on Chrome and not on Firefox.
const isChrome = () => typeof browser === "undefined"

const initialize = async () => {
  try {
    // Set up click handler
    if (api.browserAction && api.browserAction.onClicked) {
      api.browserAction.onClicked.addListener(handleClick)
    }

    // Listen for keyboard shortcuts
    if (api.commands && api.commands.onCommand) {
      api.commands.onCommand.addListener(async (command, tab) => {
        if (command === "fill-focused-field") {
          await handleFillFocusedField(tab)
        }
      })
    }

    // Create context menu
    if (api.contextMenus) {
      api.contextMenus.create({
        id: "fill-labeled-email",
        title: "Fill with labeled email",
        contexts: ["editable"],
        documentUrlPatterns: ["http://*/*", "https://*/*"],
      })
    }

    // Handle context menu clicks
    if (api.contextMenus && api.contextMenus.onClicked) {
      api.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId === "fill-labeled-email") {
          await handleContextMenuClick(tab)
        }
      })
    }
  } catch (error) {
    console.error("Extension initialization failed:", error)
  }
}

/* Handle Click */
const getHostnameByTab = (tab) => {
  try {
    const url = new URL(tab.url)

    // Skip special protocols
    if (
      url.protocol === "chrome:" ||
      url.protocol === "about:" ||
      url.protocol === "moz-extension:" ||
      url.protocol === "chrome-extension:"
    ) {
      return ""
    }

    return url.hostname
  } catch (e) {
    console.warn("Invalid tab URL:", tab.url)
    return ""
  }
}

const generateLabel = (hostname, domainMode) => {
  if (!hostname) return ""

  const hostnameArr = hostname.split(".")
  let label = hostname

  switch (domainMode) {
    case "main":
      if (hostnameArr.length >= 2) {
        // Handle common ccTLD patterns like .co.uk, .com.au, etc.
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
      label = hostname
      break
  }

  // Sanitize label for email use
  return label.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()
}

const getLabeledEmailAddress = (
  emailAddress,
  hostname,
  domainMode = "main",
) => {
  if (!emailAddress || !emailAddress.includes("@")) {
    return emailAddress
  }

  const atIndex = emailAddress.lastIndexOf("@")
  if (atIndex <= 0) return emailAddress

  const preEmail = emailAddress.substring(0, atIndex)
  const postEmail = emailAddress.substring(atIndex + 1)
  const label = generateLabel(hostname, domainMode)

  return label ? `${preEmail}+${label}@${postEmail}` : emailAddress
}

const handleContextMenuClick = async (tab) => {
  try {
    const hostname = getHostnameByTab(tab)
    const { email: emailAddress, domainMode } = await settings.get()
    const trimmedEmail = emailAddress.trim()

    if (trimmedEmail && hostname) {
      const labeledEmail = getLabeledEmailAddress(
        trimmedEmail,
        hostname,
        domainMode,
      )

      // Send message to content script to fill the email field
      try {
        await api.tabs.sendMessage(tab.id, {
          action: "fillEmailField",
          labeledEmail: labeledEmail,
        })
      } catch (error) {
        console.error("Failed to communicate with content script:", error)
      }
    } else if (!trimmedEmail) {
      // Send message to show tooltip when no email is configured
      try {
        await api.tabs.sendMessage(tab.id, {
          action: "showNoEmailTooltip",
          target: "contextMenu",
        })
      } catch (error) {
        console.error("Failed to communicate with content script:", error)
      }
    }
  } catch (error) {
    console.error("Context menu click failed:", error)
  }
}

const handleFillFocusedField = async (tab) => {
  try {
    const hostname = getHostnameByTab(tab)
    const { email: emailAddress, domainMode } = await settings.get()
    const trimmedEmail = emailAddress.trim()

    if (trimmedEmail && hostname) {
      const labeledEmail = getLabeledEmailAddress(
        trimmedEmail,
        hostname,
        domainMode,
      )

      // Send message to content script to fill the focused field
      try {
        await api.tabs.sendMessage(tab.id, {
          action: "fillFocusedField",
          labeledEmail: labeledEmail,
        })
      } catch (error) {
        console.error("Failed to communicate with content script:", error)
      }
    } else if (!trimmedEmail) {
      // Send message to show tooltip when no email is configured
      try {
        await api.tabs.sendMessage(tab.id, {
          action: "showNoEmailTooltip",
          target: "focusedField",
        })
      } catch (error) {
        console.error("Failed to communicate with content script:", error)
      }
    }
  } catch (error) {
    console.error("Fill focused field failed:", error)
  }
}

const handleClick = async () => {
  try {
    const trimmedEmail = (await settings.get()).email.trim()

    if (trimmedEmail) {
      // Open popup programmatically (Chrome only)
      // The popup will handle email generation and copying
      if (isChrome() && chrome.browserAction?.openPopup) {
        try {
          chrome.browserAction.openPopup()
        } catch (e) {
          console.warn("Failed to open popup:", e)
        }
      }
    } else {
      // Handle missing email - open popup for error display
      if (isChrome() && chrome.browserAction?.openPopup) {
        try {
          chrome.browserAction.openPopup()
        } catch (e) {
          console.warn("Failed to open error popup:", e)
        }
      }
    }
  } catch (error) {
    console.error("Handle click failed:", error)
  }
}

export default defineBackground(() => {
  initialize()
})
