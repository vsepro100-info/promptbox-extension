# PromptBox Extension

PromptBox is a Chrome extension for saving, organizing, and quickly reusing ChatGPT prompts from a simple popup UI.

## Features

- Save prompts for later use
- Edit and delete existing prompts
- Search prompts instantly
- Copy prompts to clipboard in one click
- Draft autosave support in MVP

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the project root folder (`promptbox-extension`).

## Project Structure

```
.
├── assets/
├── docs/
│   └── store.md
├── src/
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
├── CHANGELOG.md
├── README.md
└── manifest.json
```

## Privacy

Please review the [Privacy Policy](./PRIVACY.md) for details on how PromptBox handles data.

## Roadmap

- Draft autosave improvements
- Export prompts
- Cloud sync
- AI-generated prompt suggestions
