// Content script for email field detection and filling
;(() => {
  const api = webext.api

  // Find email input fields on the page
  const findEmailInputs = () => {
    const emailInputs = []

    // Look for input fields with email type
    const emailTypeInputs = document.querySelectorAll('input[type="email"]')
    emailInputs.push(...emailTypeInputs)

    // Look for input fields with email-related names/ids/placeholders
    const emailNameInputs = document.querySelectorAll(`
      input[name*="email" i],
      input[id*="email" i],
      input[placeholder*="email" i],
      input[name*="mail" i],
      input[id*="mail" i],
      input[placeholder*="mail" i]
    `)
    emailNameInputs.forEach((input) => {
      if (input.type === "text" || input.type === "email" || !input.type) {
        emailInputs.push(input)
      }
    })

    // Look for common username/login fields that might accept emails
    const usernameInputs = document.querySelectorAll(`
      input[name*="username" i],
      input[id*="username" i],
      input[name*="login" i],
      input[id*="login" i],
      input[name*="user" i],
      input[id*="user" i]
    `)
    usernameInputs.forEach((input) => {
      if (input.type === "text" || !input.type) {
        // Check if this looks like it could accept an email
        const hasEmailContext =
          input.placeholder?.toLowerCase().includes("email") ||
          input.title?.toLowerCase().includes("email") ||
          input.getAttribute("aria-label")?.toLowerCase().includes("email") ||
          // Look for nearby labels that mention email
          document
            .querySelector(`label[for="${input.id}"]`)
            ?.textContent?.toLowerCase()
            .includes("email")

        if (hasEmailContext) {
          emailInputs.push(input)
        }
      }
    })

    // Remove duplicates
    return [...new Set(emailInputs)]
  }

  // Show tooltip for when email is not configured
  const showTooltip = (targetElement, message) => {
    if (!targetElement) return

    // Remove any existing tooltip
    const existingTooltip = document.querySelector(".email-plus-tooltip")
    if (existingTooltip) {
      existingTooltip.remove()
    }

    // Create tooltip element
    const tooltip = document.createElement("div")
    tooltip.className = "email-plus-tooltip"
    tooltip.textContent = message
    tooltip.style.cssText = `
      position: absolute;
      z-index: 10001;
      background: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `

    // Add arrow
    const arrow = document.createElement("div")
    arrow.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #333;
    `
    tooltip.appendChild(arrow)

    document.body.appendChild(tooltip)

    // Position tooltip above the input
    const rect = targetElement.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop

    tooltip.style.left =
      rect.left + scrollX + rect.width / 2 - tooltip.offsetWidth / 2 + "px"
    tooltip.style.top = rect.top + scrollY - tooltip.offsetHeight - 8 + "px"

    // Show tooltip with animation
    setTimeout(() => {
      tooltip.style.opacity = "1"
    }, 10)

    // Hide tooltip after 3 seconds
    setTimeout(() => {
      tooltip.style.opacity = "0"
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.remove()
        }
      }, 200)
    }, 3000)
  }

  // Fill email field with labeled email
  const fillEmailField = (targetElement, labeledEmail) => {
    if (!targetElement || !labeledEmail) return false

    try {
      // Focus the field
      targetElement.focus()

      // Set the value
      targetElement.value = labeledEmail

      // Trigger input events to notify form frameworks
      const inputEvent = new Event("input", { bubbles: true })
      const changeEvent = new Event("change", { bubbles: true })

      targetElement.dispatchEvent(inputEvent)
      targetElement.dispatchEvent(changeEvent)

      // Brief shiny shadow animation to show what was filled
      const originalBoxShadow = targetElement.style.boxShadow
      const originalTransition = targetElement.style.transition
      targetElement.style.transition = "box-shadow 0.25s ease"
      targetElement.style.boxShadow =
        "0 0 12px rgba(59, 130, 246, 0.6), 0 0 24px rgba(59, 130, 246, 0.4)"

      setTimeout(() => {
        targetElement.style.boxShadow = originalBoxShadow
        setTimeout(() => {
          targetElement.style.transition = originalTransition
        }, 250)
      }, 750)

      return true
    } catch (error) {
      console.error("Failed to fill email field:", error)
      return false
    }
  }

  // Store the target element for context menu clicks
  let contextMenuTarget = null

  // Floating icon for quick access
  let floatingIcon = null
  let currentFocusedInput = null

  // Email generation functions (copied from background script)
  const generateLabel = (hostname, domainMode) => {
    if (!hostname) return ""

    const hostnameArr = hostname.split(".")
    let label = hostname

    switch (domainMode) {
      case "main":
        if (hostnameArr.length >= 2) {
          // More comprehensive public suffix detection
          const tld = hostnameArr[hostnameArr.length - 1]
          const sld =
            hostnameArr.length >= 3 ? hostnameArr[hostnameArr.length - 2] : null

          // Common patterns for 3-part TLDs (country code + type)
          const needsThreeParts =
            hostnameArr.length >= 3 &&
            // UK domains
            ((tld === "uk" &&
              [
                "co",
                "org",
                "net",
                "gov",
                "edu",
                "ac",
                "police",
                "sch",
                "nhs",
              ].includes(sld)) ||
              // Australian domains
              (tld === "au" &&
                ["com", "org", "net", "gov", "edu", "asn", "id"].includes(
                  sld,
                )) ||
              // New Zealand domains
              (tld === "nz" &&
                [
                  "co",
                  "org",
                  "net",
                  "gov",
                  "edu",
                  "ac",
                  "school",
                  "cri",
                ].includes(sld)) ||
              // Canadian domains
              (tld === "ca" &&
                [
                  "ab",
                  "bc",
                  "mb",
                  "nb",
                  "nl",
                  "ns",
                  "nt",
                  "nu",
                  "on",
                  "pe",
                  "qc",
                  "sk",
                  "yk",
                ].includes(sld)) ||
              // Japanese domains
              (tld === "jp" &&
                ["co", "or", "ne", "ac", "ad", "ed", "go", "gr"].includes(
                  sld,
                )) ||
              // South African domains
              (tld === "za" &&
                ["co", "org", "net", "gov", "edu", "ac", "web"].includes(
                  sld,
                )) ||
              // Brazilian domains
              (tld === "br" &&
                ["com", "org", "net", "gov", "edu", "mil"].includes(sld)) ||
              // Indian domains
              (tld === "in" &&
                ["co", "org", "net", "gov", "edu", "ac", "res", "mil"].includes(
                  sld,
                )) ||
              // Chinese domains
              (tld === "cn" &&
                ["com", "org", "net", "gov", "edu", "ac"].includes(sld)) ||
              // German state domains
              (tld === "de" && hostnameArr.length >= 4) ||
              // Other common patterns
              (["com", "org", "net", "gov", "edu", "mil", "int"].includes(
                sld,
              ) &&
                ![
                  "com",
                  "org",
                  "net",
                  "gov",
                  "edu",
                  "mil",
                  "int",
                  "info",
                  "biz",
                ].includes(tld)))

          if (needsThreeParts) {
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

  const generateLabeledEmail = (
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

  // Create floating icon element
  const createFloatingIcon = () => {
    const icon = document.createElement("div")
    const plusSymbol = document.createElement("span")
    plusSymbol.textContent = "+"
    plusSymbol.style.cssText = `
      display: block;
      margin-top: -2px;
    `
    icon.appendChild(plusSymbol)
    icon.style.cssText = `
      position: absolute;
      z-index: 10000;
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: white;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
      transition: all 0.2s ease;
      opacity: 0.9;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `

    // Hover effects
    icon.addEventListener("mouseenter", () => {
      icon.style.opacity = "1"
      icon.style.transform = "scale(1.15)"
      icon.style.boxShadow =
        "0 4px 12px rgba(59, 130, 246, 0.5), 0 0 0 2px rgba(59, 130, 246, 0.2)"
      icon.style.borderColor = "#60a5fa"
    })

    icon.addEventListener("mouseleave", () => {
      icon.style.opacity = "0.9"
      icon.style.transform = "scale(1)"
      icon.style.boxShadow = "0 2px 6px rgba(59, 130, 246, 0.3)"
      icon.style.borderColor = "#ffffff"
    })

    // Click handler
    icon.addEventListener("click", async (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (currentFocusedInput) {
        try {
          // Get current tab info and generate labeled email directly
          const hostname = window.location.hostname

          const { email: emailAddress, domainMode } = await settings.get()
          const trimmedEmail = emailAddress.trim()

          if (trimmedEmail && hostname) {
            const labeledEmail = generateLabeledEmail(
              trimmedEmail,
              hostname,
              domainMode,
            )
            fillEmailField(currentFocusedInput, labeledEmail)
          } else if (!trimmedEmail) {
            // Show tooltip when no email is configured
            showTooltip(
              currentFocusedInput,
              "Please configure your email address in the extension settings first",
            )
          }
        } catch (error) {
          console.error("Failed to generate labeled email:", error)
        }
      }
    })

    return icon
  }

  // Position the floating icon relative to input field
  const positionFloatingIcon = (inputElement) => {
    if (!floatingIcon || !inputElement) return

    const rect = inputElement.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop

    floatingIcon.style.left = rect.right + scrollX - 8 + "px"
    floatingIcon.style.top = rect.top + scrollY - 8 + "px"
  }

  // Show floating icon
  const showFloatingIcon = (inputElement) => {
    if (!inputElement) return

    // Create icon if it doesn't exist
    if (!floatingIcon) {
      floatingIcon = createFloatingIcon()
      document.body.appendChild(floatingIcon)
    }

    currentFocusedInput = inputElement
    positionFloatingIcon(inputElement)
    floatingIcon.style.display = "flex"
  }

  // Hide floating icon
  const hideFloatingIcon = () => {
    if (floatingIcon) {
      floatingIcon.style.display = "none"
    }
    currentFocusedInput = null
  }

  // Track right-click target
  document.addEventListener("contextmenu", (event) => {
    const target = event.target

    // Store any input field as the target (for context menu functionality)
    if (
      target.tagName === "INPUT" &&
      (target.type === "text" ||
        target.type === "email" ||
        target.type === "search" ||
        !target.type)
    ) {
      contextMenuTarget = target
    } else {
      contextMenuTarget = null
    }
  })

  // Listen for messages from background script
  api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fillEmailField") {
      const success = fillEmailField(contextMenuTarget, request.labeledEmail)
      sendResponse({ success })
    } else if (request.action === "fillFocusedField") {
      const focusedElement = document.activeElement
      const success = fillEmailField(focusedElement, request.labeledEmail)
      sendResponse({ success })
    } else if (request.action === "showNoEmailTooltip") {
      // Show tooltip when no email is configured
      if (request.target === "contextMenu" && contextMenuTarget) {
        showTooltip(
          contextMenuTarget,
          "Please configure your email address in the extension settings first",
        )
      } else if (request.target === "focusedField") {
        const focusedElement = document.activeElement
        if (focusedElement && focusedElement.tagName === "INPUT") {
          showTooltip(
            focusedElement,
            "Please configure your email address in the extension settings first",
          )
        }
      }
      sendResponse({ success: true })
    } else if (request.action === "hasEmailFields") {
      const emailInputs = findEmailInputs()
      sendResponse({ hasEmailFields: emailInputs.length > 0 })
    } else if (request.action === "labeledEmailResponse") {
      // Handle response for floating icon click
      if (currentFocusedInput && request.labeledEmail) {
        fillEmailField(currentFocusedInput, request.labeledEmail)
      }
      sendResponse({ success: true })
    }

    return true // Keep the message channel open for async response
  })

  // Focus and blur event listeners for floating icon
  document.addEventListener("focusin", async (event) => {
    const target = event.target
    if (target.tagName === "INPUT" && target.type === "email") {
      const { showFloatingIcon: enabled } = await settings
        .get()
        .catch((error) => {
          console.error("Failed to check floating icon setting:", error)
          return settings.defaults
        })
      if (enabled) showFloatingIcon(target)
    }
  })

  document.addEventListener("focusout", (event) => {
    // Small delay to allow clicking the floating icon before it disappears
    setTimeout(() => {
      if (document.activeElement !== currentFocusedInput) {
        hideFloatingIcon()
      }
    }, 150)
  })

  // Update icon position on scroll or resize
  window.addEventListener("scroll", () => {
    if (currentFocusedInput && floatingIcon) {
      positionFloatingIcon(currentFocusedInput)
    }
  })

  window.addEventListener("resize", () => {
    if (currentFocusedInput && floatingIcon) {
      positionFloatingIcon(currentFocusedInput)
    }
  })
})()
