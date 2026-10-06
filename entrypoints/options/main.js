import "@kud/webext-ui/tokens.css"
import "@kud/webext-ui/webext-ui.css"
import "../../assets/theme.css"
import "./index.css"
import { settings } from "../../utils/settings"

const SAMPLE_HOST = "www.shop.example.com"
const PLACEHOLDER_EMAIL = "you@example.org"

// Auto-save functionality
let saveTimeout = null

const showSaveIndicator = () => {
  const saveIndicator = document.querySelector(".save-indicator")
  saveIndicator.classList.add("show")

  setTimeout(() => {
    saveIndicator.classList.remove("show")
  }, 1500)
}

const selectedDomainMode = () =>
  document.querySelector('input[name="domainMode"]:checked')?.value ?? "main"

const autoSave = async () => {
  const emailInput = document.querySelector("#email")
  const emailError = document.querySelector("#email-error")
  const showHistoryCheckbox = document.querySelector("#showHistory")
  const showFloatingIconCheckbox = document.querySelector("#showFloatingIcon")

  const emailValue = emailInput.value.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  emailInput.classList.remove("invalid")
  emailInput.removeAttribute("aria-invalid")
  emailError.hidden = true

  if (emailValue && !emailRegex.test(emailValue)) {
    emailInput.classList.add("invalid")
    emailInput.setAttribute("aria-invalid", "true")
    emailError.hidden = false
    return
  }

  try {
    await settings.set({
      email: emailValue,
      domainMode: selectedDomainMode(),
      showHistory: showHistoryCheckbox.checked,
      showFloatingIcon: showFloatingIconCheckbox.checked,
    })

    if (!emailValue || emailRegex.test(emailValue)) {
      showSaveIndicator()
    }
  } catch (error) {
    console.error("Failed to auto-save options:", error)
  }
}

const debouncedAutoSave = () => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(autoSave, 500)
}

const restoreOptions = async () => {
  try {
    const { email, domainMode, showHistory, showFloatingIcon } = await settings
      .get()
      .catch((error) => {
        console.error("Failed to read options, showing defaults:", error)
        return settings.defaults
      })

    const emailInput = document.querySelector("#email")
    const showHistoryCheckbox = document.querySelector("#showHistory")
    const showFloatingIconCheckbox = document.querySelector("#showFloatingIcon")

    if (email && emailInput) {
      emailInput.value = email
    }
    const modeRadio = document.querySelector(
      `input[name="domainMode"][value="${domainMode}"]`,
    )
    if (modeRadio) {
      modeRadio.checked = true
    }
    if (showHistoryCheckbox) {
      showHistoryCheckbox.checked = showHistory
    }
    if (showFloatingIconCheckbox) {
      showFloatingIconCheckbox.checked = showFloatingIcon
    }

    updateExamples()
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

// Each radio shows the address it would produce, so a first run with no
// address yet previews on a muted placeholder instead of an em dash.
const updateExamples = () => {
  const emailInput = document.querySelector("#email")
  const typed = emailInput.value.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const email = emailRegex.test(typed) ? typed : PLACEHOLDER_EMAIL

  document.querySelectorAll(".choice-example").forEach((example) => {
    const preview = generatePreviewEmail(
      email,
      SAMPLE_HOST,
      example.dataset.mode,
    )
    example.textContent = ""
    appendTaggedAddress(example, preview)
  })
}

document.addEventListener("DOMContentLoaded", restoreOptions)

document.querySelector("#email").addEventListener("input", () => {
  debouncedAutoSave()
  updateExamples()
})

document.querySelectorAll('input[name="domainMode"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    autoSave()
    updateExamples()
  })
})

document.querySelector("#showHistory").addEventListener("change", () => {
  autoSave()
})

document.querySelector("#showFloatingIcon").addEventListener("change", () => {
  autoSave()
})
