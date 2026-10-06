# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.4.0] - 2026-10-07

### Changed

- Popup and options page redesigned as a Nova panel. The popup shows the copied address with its +tag highlighted, and the 4-second auto-close now pauses while you hover or focus it, with a progress bar that follows. ([4f4f68d](https://github.com/kud/webext-email-address-plus/commit/4f4f68d736a9c2757891c703add0ac7359829ef4))
- Options page has a fresh layout; settings, values and auto-save work as before. ([4f4f68d](https://github.com/kud/webext-email-address-plus/commit/4f4f68d736a9c2757891c703add0ac7359829ef4))

<details>
<summary>Internal (1 commit)</summary>

- Web preview gallery of the popup and options on invented fixture data, deployable to Vercel (`npm run preview`, `build:preview`) and excluded from the extension and sources zips.

</details>

## [5.3.1] - 2026-06-28

### Changed

- Version bump

## [5.3.0] - 2025-08-16

### Changed

- Version bump

## [5.2.4] - 2025-08-16

### Changed

- Version bump

## [5.2.3] - 2025-08-16

### Changed

- Version bump

## [5.2.2] - 2025-08-16

### Changed

- Updated Node.js engine requirement to version 22.0.0 for latest stable features
- Increased icon stroke width from 1.1 to 1.3 for improved visibility and consistency

## [5.2.1] - 2025-08-10

### Changed

- Version bump

## [5.1.1] - 2025-08-10

### Changed

- Version bump

## [5.2.0] - 2025-08-10

### Added

- Visual feedback animation when filling input fields with blue glow effect
- Smart tooltip system that appears when email address is not configured
- Comprehensive user guidance for unconfigured extension state

### Improved

- Enhanced input filling animation with subtle blue shadow effect that works on both light and dark backgrounds
- Better user experience when extension is used before configuration
- Tooltip positioning and styling for better visibility and user guidance

### Changed

- Replaced background color change animation with elegant shadow-based visual feedback
- Animation duration and intensity optimized for better user experience
- All filling methods (floating icon, context menu, keyboard shortcut) now show helpful tooltips when no email is configured

### Fixed

- Visual feedback animation now works consistently across different website themes and backgrounds
- Proper error handling and user feedback when attempting to use extension without email configuration

## [5.1.0] - 2025-08-10

### Changed

- Version bump

## [5.0.9] - 2025-08-10

### Changed

- Version bump

## [5.0.8] - 2025-08-10

### Improved

- Enhanced dark mode support for the tooltip popup with better theme detection
- Added explicit dark mode styling using data attributes and CSS classes for improved browser compatibility
- Improved system dark mode preference detection for extension popups
- Added color-scheme meta tag support for better native dark mode integration

### Fixed

- Tooltip now properly displays in dark mode across all supported browsers
- Resolved styling inconsistencies when using dark browser themes
- Fixed theme detection to work reliably in browser extension popup contexts

## [5.0.7] - 2025-08-10

### Changed

- Version bump

## [5.0.6] - 2025-08-10

### Fixed

- Icon theme detection now works reliably for both light and dark browser themes
- Fixed parsing of `rgba()` color values from browser theme for accurate brightness calculation
- Resolved issue where dark theme icons were not displaying correctly in browser toolbars

### Changed

- Enhanced theme detection logic to support both `rgb()` and `rgba()` color formats
- Improved robustness of icon update system with better error handling
- Cleaned up debug logging in background script for production use

## [5.0.5] - 2025-08-09

### Changed

- Version bump

## [5.0.4] - 2025-08-09

### Changed

- Version bump

## [5.0.3] - 2025-08-09

### Changed

- Version bump

## [5.0.2] - 2025-08-09

### Changed

- Version bump

## [5.0.1] - 2025-08-09

### Changed

- Version bump

## [5.0.0] - 2025-08-09

### Added

- Context menu integration: Right-click on any input field to fill with labeled email
- Floating icon feature: Shows 📧 icon next to focused input fields for quick filling
- Direct keyboard shortcut: Ctrl+Shift+Y (Cmd+Shift+Y) now fills focused input field directly
- Settings option to show/hide floating icon on input fields

### Changed

- Replaced popup keyboard shortcut with direct field filling functionality
- Enhanced input field detection for better compatibility across websites
- Improved user experience with multiple convenient filling methods

### Fixed

- Context menu now works reliably across all input field types
- Floating icon positioning updates correctly on scroll and resize
- Proper message handling between content script and background script

## [4.0.6] - 2025-08-09

### Changed

- Version bump

## [4.0.5] - 2025-08-09

### Changed

- Updated publishing workflow to use Mozilla's listed channel for public distribution
- Automated version synchronization between package.json and manifest.json
- Enhanced build process with automatic changelog integration for AMO releases

### Fixed

- Resolved version conflicts during extension publishing
- Improved deployment pipeline for Mozilla Add-on store submissions

## [2.0.0] - 2025-08-09

### Added

- Dynamic icon switching based on browser theme and toolbar colors
- Support for adaptive tab color extensions
- Enhanced theme detection using toolbar color brightness analysis
- Theme permission for better browser integration

### Changed

- Improved icon update logic to work with dynamic toolbar colors
- Enhanced background script with better error handling
- Updated package.json with proper metadata and modern tooling

### Fixed

- Icon now properly adapts to light/dark themes in real-time
- Resolved issue where icon wouldn't change with adaptive tab color extensions
- Fixed theme detection to work with system preferences and custom themes

## [1.2.0] - Previous Release

### Added

- Better icon and UK domain handling
- Dynamic icon update and tooltip for copied email address functionality

### Changed

- Improved domain handling logic

## [0.1.0] - Initial Release

### Added

- Basic email address plus-labeling functionality
- Browser action with popup
- Options page for configuration
- Keyboard shortcut support
- Multi-locale support
