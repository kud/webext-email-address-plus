import { api } from "@kud/webext"
import { defineBackground } from "wxt/utils/define-background"
import { settings } from "../utils/settings"

// `api` resolves the namespace but deliberately erases which one it
// resolved to, and openPopup below is the one place that difference matters:
// it is callable from a browserAction click on Chrome and not on Firefox.
const isChrome = () => typeof browser === "undefined"

/* Handle Theme Detection and Icon Updates */
const parseRGBColor = (colorString) => {
  // Handle both rgb() and rgba() formats
  const rgbMatch = colorString.match(/rgba?\(([^)]+)\)/)
  if (!rgbMatch) return null

  const values = rgbMatch[1].split(",").map((v) => parseFloat(v.trim()))
  if (values.length < 3 || values.some(isNaN)) return null

  // Return just the first 3 values (RGB, ignore alpha)
  return [values[0], values[1], values[2]]
}

const calculateBrightness = (r, g, b) => {
  // Using luminance formula
  return (r * 299 + g * 587 + b * 114) / 1000
}

const updateIcon = async () => {
  try {
    let isDark = false

    // Method 1: Try theme API (Firefox primarily)
    try {
      if (api.theme && api.theme.getCurrent) {
        const theme = await api.theme.getCurrent()
        console.log("Theme object:", theme)

        // Check if we have theme colors
        if (theme && theme.colors) {
          const toolbarColor =
            theme.colors.toolbar ||
            theme.colors.frame ||
            theme.colors.tab_background_text ||
            "rgb(255, 255, 255)"
          console.log("Found toolbar color:", toolbarColor)

          if (toolbarColor.includes("rgb(")) {
            const rgbValues = parseRGBColor(toolbarColor)
            if (rgbValues) {
              const [r, g, b] = rgbValues
              const brightness = calculateBrightness(r, g, b)
              isDark = brightness < 128
              console.log(
                "Theme API - RGB:",
                r,
                g,
                b,
                "Brightness:",
                brightness,
                "isDark:",
                isDark,
              )
            }
          } else if (toolbarColor.includes("#")) {
            // Handle hex colors
            const hex = toolbarColor.replace("#", "")
            const r = parseInt(hex.substr(0, 2), 16)
            const g = parseInt(hex.substr(2, 2), 16)
            const b = parseInt(hex.substr(4, 2), 16)
            const brightness = calculateBrightness(r, g, b)
            isDark = brightness < 128
            console.log(
              "Theme API - Hex RGB:",
              r,
              g,
              b,
              "Brightness:",
              brightness,
              "isDark:",
              isDark,
            )
          }
        } else {
          console.log("No theme colors found, trying system preference")
          // Check system preference as fallback
          if (typeof window !== "undefined" && window.matchMedia) {
            isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
            console.log("System preference isDark:", isDark)
          }
        }
      }
    } catch (themeError) {
      console.log("Theme API error:", themeError)
      // Chrome fallback or when theme API fails
      if (typeof window !== "undefined" && window.matchMedia) {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        console.log("Fallback matchMedia isDark:", isDark)
      }
    }

    const iconPath = isDark ? "icons/icon-dark.svg" : "icons/icon.svg"
    console.log("Final decision - Using icon:", iconPath, "isDark:", isDark)

    await api.browserAction.setIcon({
      path: {
        16: iconPath,
        32: iconPath,
        48: iconPath,
      },
    })

    console.log("Icon set successfully to:", iconPath)
  } catch (error) {
    console.error("Icon update failed:", error)
    try {
      await api.browserAction.setIcon({ path: "icons/icon.svg" })
      console.log("Fallback to default icon")
    } catch (fallbackError) {
      console.error("Fallback icon update failed:", fallbackError)
    }
  }
}

// Initialize
const initialize = async () => {
  try {
    // Set initial icon
    await updateIcon()

    // Update when theme changes
    if (api.theme && api.theme.onUpdated) {
      api.theme.onUpdated.addListener(updateIcon)
    }

    // Update when switching tabs (adaptive colors change per site)
    if (api.tabs && api.tabs.onActivated) {
      api.tabs.onActivated.addListener(updateIcon)
    }

    // Update when tab content changes
    if (api.tabs && api.tabs.onUpdated) {
      api.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === "complete") {
          // Small delay to let adaptive tab color do its thing
          setTimeout(updateIcon, 100)
        }
      })
    }

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
        if (hostnameArr.length >= 3 && 
            (hostnameArr[hostnameArr.length - 2] === "co" || 
             hostnameArr[hostnameArr.length - 2] === "com" || 
             hostnameArr[hostnameArr.length - 2] === "org" || 
             hostnameArr[hostnameArr.length - 2] === "net" || 
             hostnameArr[hostnameArr.length - 2] === "gov" || 
             hostnameArr[hostnameArr.length - 2] === "edu" || 
             hostnameArr[hostnameArr.length - 2] === "ac")) {
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
