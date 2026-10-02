import { api, invoke } from "@kud/webext"
import "@kud/webext-ui/tokens.css"
import "@kud/webext-ui/webext-ui.css"
import "../../assets/theme.css"
import "./tooltip.css"
import { settings } from "../../utils/settings"
;(async function () {
  const title = document.getElementById("card-title")
  const subtitle = document.getElementById("card-subtitle")

  if (!title || !subtitle) {
    console.error("Required DOM elements not found")
    return
  }

  let email = ""
  let domainMode = "main"
  let hostname = ""

  try {
    // Get email and domainMode from storage
    const prefs = await settings.get()
    email = prefs.email.trim()
    domainMode = prefs.domainMode

    // Get the current tab's hostname
    const tabs = await invoke(api.tabs, "query", {
      active: true,
      currentWindow: true,
    })
    if (tabs?.[0]?.url) {
      try {
        const url = new URL(tabs[0].url)
        hostname = url.hostname

        // Skip special protocols
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
  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.includes("@")
  }

  // Improved domain parsing function
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

  // Email history management
  const MAX_HISTORY_ITEMS = 3

  const saveEmailToHistory = async (emailAddress) => {
    try {
      let history = (await settings.get()).emailHistory

      // Remove if already exists (move to front)
      history = history.filter((item) => item !== emailAddress)

      // Add to front
      history.unshift(emailAddress)

      // Keep only MAX_HISTORY_ITEMS
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

      historyList.innerHTML = ""

      history.forEach((email) => {
        const item = document.createElement("div")
        item.className = "row"

        const emailSpan = document.createElement("span")
        emailSpan.className = "history-email"
        emailSpan.textContent = email

        const copyBtn = document.createElement("button")
        copyBtn.className = "btn"
        const btnLabel = document.createElement("span")
        btnLabel.setAttribute("aria-live", "polite")
        btnLabel.textContent = "Copy"
        copyBtn.appendChild(btnLabel)
        copyBtn.addEventListener("click", async () => {
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(email)
            } else {
              const textArea = document.createElement("textarea")
              textArea.value = email
              document.body.appendChild(textArea)
              textArea.select()
              document.execCommand("copy")
              document.body.removeChild(textArea)
            }
            btnLabel.textContent = "Copied"
            setTimeout(() => {
              btnLabel.textContent = "Copy"
            }, 1000)
          } catch (e) {
            console.error("Failed to copy from history:", e)
          }
        })

        item.appendChild(emailSpan)
        item.appendChild(copyBtn)
        historyList.appendChild(item)
      })

      historySection.hidden = false
    } catch (error) {
      console.error("Failed to render email history:", error)
    }
  }

  // Success animation function
  const showSuccessAnimation = (labeledEmail) => {
    const title = document.getElementById("card-title")
    const subtitle = document.getElementById("card-subtitle")

    // Save to history
    saveEmailToHistory(labeledEmail)

    // Wait a bit for tooltip to display before starting animation
    setTimeout(() => {
      title.innerHTML =
        '<span class="success-checkmark">✅</span>Email address copied'
      subtitle.textContent = `${labeledEmail} • Ready to paste`
    }, 200)
  }

  if (!email) {
    title.textContent = "❌ Email address missing"
    subtitle.textContent =
      "Please set your email address in the extension preferences."
    subtitle.classList.add("error")
  } else if (!isValidEmail(email)) {
    title.textContent = "❌ Invalid email format"
    subtitle.textContent =
      "Please check your email address in the extension preferences."
    subtitle.classList.add("error")
  } else {
    // Generate labeled email
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

    // Copy to clipboard with better error handling
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(labeledEmail)
        showSuccessAnimation(labeledEmail)
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea")
        textArea.value = labeledEmail
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        showSuccessAnimation(labeledEmail)
      }
      subtitle.classList.remove("error")
    } catch (e) {
      console.error("Failed to copy to clipboard:", e)
      title.textContent = "⚠️ Copy failed"
      subtitle.textContent = `Email: ${labeledEmail}`
      subtitle.classList.add("error")
    }
  }
  // Settings button functionality
  const settingsBtn = document.getElementById("settings-btn")
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      api.runtime.openOptionsPage()
    })
  }

  // Render email history
  renderEmailHistory()

  // Auto-close after 4s
  setTimeout(() => window.close(), 4000)
})()
