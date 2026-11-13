<div align="center">

<img src="assets/icon.svg" width="128" alt="Email Address Plus icon" />

📧

# Email Address Plus

![Firefox Add-on](https://img.shields.io/amo/v/email-address-plus?style=flat-square&logo=firefoxbrowser&logoColor=white&color=FF7139)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**Get a shiny email address with a ✌️ label ✌️ depending on the hostname**

<a href="https://kud.io/projects/webext-email-address-plus">Website</a> · <a href="https://kud.io/projects/webext-email-address-plus/docs">Documentation</a>

</div>

## Features

**Automatically generate labeled email addresses for better organization and spam protection.** Email Address Plus adds website-specific labels to your email address when filling forms, making it easy to track where emails come from and organize your inbox.

- **Smart email labeling** — automatically adds "+website" labels to your email (e.g., `user+amazon@example.com`)
- **Multiple fill methods** — a floating 📧 icon next to email inputs, a right-click context menu, or a keyboard shortcut (Ctrl+Shift+Y / Cmd+Shift+Y)
- **Visual feedback** — elegant blue glow animations confirm when fields are filled
- **Theme support** — works seamlessly across light and dark browser themes
- **Privacy focused** — all processing happens locally, no data sent to external servers
- **Smart guidance** — helpful tooltips when the extension needs configuration
- **Easy setup** — simple one-time configuration in extension settings

## How It Works

1. **Configure**: Set your email address in the extension settings
2. **Browse**: Visit any website with email input fields
3. **Fill**: Use the floating 📧 icon, right-click menu, or keyboard shortcut
4. **Organized**: Your email gets automatically labeled with the website name

Perfect for organizing newsletters, shopping accounts, and identifying spam sources.

## Install

### From Firefox Add-ons (remote)

[Email Address Plus on Firefox Add-ons](https://addons.mozilla.org/firefox/addon/email-address-plus/)

Chrome Web Store: coming soon.

### From source (local)

```sh
git clone https://github.com/kud/webext-email-address-plus.git
cd webext-email-address-plus
npm ci
npm run build
```

Load it in Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `.output/firefox-mv2/manifest.json`. Temporary add-ons are dropped on restart and must be reloaded after every change.

## Usage

### Method 1: Floating Icon

- Focus on any email input field
- Click the 📧 icon that appears
- Your labeled email is automatically filled

### Method 2: Context Menu

- Right-click on any email input field
- Select "Fill with labeled email"
- Field is filled instantly

### Method 3: Keyboard Shortcut

- Focus on any email input field
- Press `Ctrl+Shift+Y` (Windows/Linux) or `Cmd+Shift+Y` (Mac)
- Email is filled with website label

## Configuration

1. Click the extension icon in your browser toolbar
2. Enter your email address
3. Choose labeling mode:
   - **Full**: Uses complete domain (e.g., `user+sub.example.com@domain.com`)
   - **Main**: Uses main domain only (e.g., `user+example.com@domain.com`)
   - **Short**: Uses domain name only (e.g., `user+example@domain.com`)

## Compatibility

- **Email Providers**: Gmail, Outlook, Yahoo, and any provider supporting plus-addressing
- **Browsers**: Firefox, Chrome, Edge, and other Chromium-based browsers
- **Websites**: Works with virtually all email input forms

## Development

```bash
# Install the exact locked dependencies (Node 22 or later)
npm ci

# Run in development mode
npm run dev

# Build extension into .output/firefox-mv2
npm run build

# Lint the built extension (run after build)
npm run lint
```

## Web demo

`preview/` is the live demo: the real popup and options pages, exactly as they
ship, side by side on one realistic set of invented `example.*` data, running
against a fake `browser` API shim. Generating an address, the Recent list and
the settings all work; changes live in the tab's session storage and vanish when
it closes. The popup stays open instead of closing after four seconds, and its
timer bar is hidden for that reason. It is excluded from the extension build and
the AMO source zip, and `vercel.json` deploys it.

```bash
# Run the demo locally
npm run preview

# Static output in preview-dist/ (also what vercel.json deploys)
npm run build:preview
```

The colour scheme follows the OS. `preview/fixtures/demo.json` holds the data.

## Updating the AMO listing

The public add-on page (name, summary, description, categories and screenshots) lives in this repo: `amo/listing.json` for the text, `amo/screenshots/` for the previews (name-sorted, with an optional same-named `.txt` as the caption). The repo is the source of truth, so anything edited by hand on the AMO dashboard gets overwritten on the next push.

```bash
# Dry run: diff against the live listing, send nothing
npx -y @kud/amo-cli@0.1.1 listing push --listing amo/listing.json --guid email-address-plus@kud.io --screenshots amo/screenshots --only=listing,previews

# Send the changes to AMO
npx -y @kud/amo-cli@0.1.1 listing push --listing amo/listing.json --guid email-address-plus@kud.io --screenshots amo/screenshots --only=listing,previews --apply
```

Sending needs `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` in the environment (the JWT issuer and secret from [AMO's API credentials page](https://addons.mozilla.org/en-US/developers/addon/api/key/)). The description is Markdown, which AMO renders on the page. The work is done by [`@kud/amo-cli`](https://kud.io/projects/amo-cli).

## Licence

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/kud/webextension-email-address-plus/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/kud/webextension-email-address-plus/discussions)

Made with ❤️ by [kud](https://github.com/kud)

📚 **Full documentation → [webext-email-address-plus/docs](https://kud.io/projects/webext-email-address-plus/docs)**
