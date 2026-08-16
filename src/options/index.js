// Auto-save functionality
let saveTimeout = null

const showSaveIndicator = () => {
  const saveStatus = document.querySelector("#save-status")
  const saveIndicator = document.querySelector(".save-indicator")

  // The hidden attribute rather than an inline display style: the design
  // system makes [hidden] authoritative with !important, so an inline
  // display would lose to it and the indicator would never appear.
  saveStatus.hidden = false
  saveIndicator.classList.add("show")

  setTimeout(() => {
    saveIndicator.classList.remove("show")
    setTimeout(() => {
      saveStatus.hidden = true
    }, 300)
  }, 1500)
}

const autoSave = async () => {
  const emailInput = document.querySelector("#email")
  const domainModeSelect = document.querySelector("#domainMode")
  const showHistoryCheckbox = document.querySelector("#showHistory")
  const showFloatingIconCheckbox = document.querySelector("#showFloatingIcon")

  const emailValue = emailInput.value.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Clear previous invalid state
  emailInput.classList.remove("invalid")

  // Only validate email if it's not empty
  if (emailValue && !emailRegex.test(emailValue)) {
    emailInput.classList.add("invalid")
    return // Don't save invalid email
  }

  // Get browser API with compatibility
  const getBrowserAPI = () => {
    if (typeof browser !== "undefined" && browser.storage) {
      return browser
    } else if (typeof chrome !== "undefined" && chrome.storage) {
      return chrome
    }
    throw new Error("No browser storage API available")
  }

  try {
    const api = getBrowserAPI()
    await api.storage.local.set({
      email: emailValue,
      domainMode: domainModeSelect.value,
      showHistory: showHistoryCheckbox.checked,
      showFloatingIcon: showFloatingIconCheckbox.checked,
    })

    // Show save indicator only if email is valid
    if (!emailValue || emailRegex.test(emailValue)) {
      showSaveIndicator()
    }
  } catch (error) {
    console.error("Failed to auto-save options:", error)
  }
}

const debouncedAutoSave = () => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(autoSave, 500) // Wait 500ms after last change
}

const restoreOptions = async () => {
  try {
    const getBrowserAPI = () => {
      if (typeof browser !== "undefined" && browser.storage) {
        return browser
      } else if (typeof chrome !== "undefined" && chrome.storage) {
        return chrome
      }
      throw new Error("No browser storage API available")
    }

    const api = getBrowserAPI()
    const { email, domainMode, showHistory, showFloatingIcon } =
      await api.storage.local.get([
        "email",
        "domainMode",
        "showHistory",
        "showFloatingIcon",
      ])

    const emailInput = document.querySelector("#email")
    const domainModeSelect = document.querySelector("#domainMode")
    const showHistoryCheckbox = document.querySelector("#showHistory")
    const showFloatingIconCheckbox = document.querySelector("#showFloatingIcon")

    if (email && emailInput) {
      emailInput.value = email
    }
    if (domainMode && domainModeSelect) {
      domainModeSelect.value = domainMode
    }
    if (showHistoryCheckbox) {
      showHistoryCheckbox.checked = showHistory !== false // Default to true
    }
    if (showFloatingIconCheckbox) {
      showFloatingIconCheckbox.checked = showFloatingIcon !== false // Default to true
    }

    // Update preview after restoring values
    updatePreview()
  } catch (error) {
    console.error("Failed to restore options:", error)
  }
}

// Email preview functionality
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

  return label.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()
}

const generatePreviewEmail = (email, hostname, domainMode) => {
  if (!email || !email.includes("@")) return email

  const atIndex = email.lastIndexOf("@")
  if (atIndex <= 0) return email

  const preEmail = email.substring(0, atIndex)
  const postEmail = email.substring(atIndex + 1)
  const label = generateLabel(hostname, domainMode)

  return label ? `${preEmail}+${label}@${postEmail}` : email
}

const updatePreview = () => {
  const emailInput = document.querySelector("#email")
  const domainModeSelect = document.querySelector("#domainMode")
  const previewGroup = document.querySelector("#preview-group")
  const previewDiv = document.querySelector("#email-preview")

  const email = emailInput.value.trim()
  const domainMode = domainModeSelect.value

  if (!email || !email.includes("@")) {
    previewGroup.hidden = true
    return
  }

  // Sample websites for examples
  const sampleSites = [
    { hostname: "github.com", name: "GitHub" },
    { hostname: "www.amazon.com", name: "Amazon" },
    { hostname: "mail.google.com", name: "Gmail" },
  ]

  previewDiv.innerHTML = ""
  sampleSites.forEach((site) => {
    const generatedEmail = generatePreviewEmail(
      email,
      site.hostname,
      domainMode,
    )

    const previewItem = document.createElement("div")
    previewItem.className = "preview-item"

    const labelSpan = document.createElement("span")
    labelSpan.className = "preview-label"
    labelSpan.textContent = site.name + ":"

    const emailSpan = document.createElement("span")
    emailSpan.className = "preview-email"
    emailSpan.textContent = generatedEmail

    previewItem.appendChild(labelSpan)
    previewItem.appendChild(emailSpan)

    previewDiv.appendChild(previewItem)
  })
  previewGroup.hidden = false
}

document.addEventListener("DOMContentLoaded", restoreOptions)

// Add event listeners for auto-save and preview
document.querySelector("#email").addEventListener("input", () => {
  debouncedAutoSave()
  updatePreview()
})

document.querySelector("#domainMode").addEventListener("change", () => {
  autoSave() // Immediate save for dropdown changes
  updatePreview()
})

document.querySelector("#showHistory").addEventListener("change", () => {
  autoSave() // Immediate save for checkbox changes
})

document.querySelector("#showFloatingIcon").addEventListener("change", () => {
  autoSave() // Immediate save for checkbox changes
})
