<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="media/logos/darkmode_white_text.png">
    <source media="(prefers-color-scheme: light)" srcset="media/logos/lodex.png">
    <img src="media/logos/lodex.png" alt="Lodex" width="360">
  </picture>
</p>

# Lodex

A coding agent for Visual Studio Code, powered by DeepSeek Harness and your chosen model endpoint.

## Install

Download the VSIX matching the machine running the extension from [GitHub Releases](https://github.com/djblu/Lodex/releases):

- Windows x64: `lodex-1.0.0-win32-x64.vsix`
- Linux x64, including Linux Remote SSH hosts: `lodex-1.0.0-linux-x64.vsix`
- Apple Silicon: `lodex-1.0.0-darwin-arm64.vsix`

Run **Extensions: Install from VSIX…**, then **Developer: Reload Window**. Open Lodex and select **Connect to server** to save your model API address, API key and model. A compatible OpenAI-style endpoint is required; the model itself runs wherever that endpoint is hosted. Images require a vision-capable endpoint.

The extension and coding harness run beside your workspace, locally or on the Remote SSH host. Native packages include Node.js and DeepSeek Harness `0.2.1-rc.5`; first use verifies and extracts the bundled runtime, then reuses it. Other supported x64/ARM64 hosts can use the source fallback. No Git checkout is needed to install the bridge.

Lodex uses its own extension identity, settings and saved-chat storage. Connection credentials are held in VS Code SecretStorage. Credentials, chats and model weights are never included in runtime bundles or release files.

## Features

- Saved chats with rename, search, deletion and message copy/edit.
- Read Only, Ask Permission and Full Access modes.
- Live progress, grouped tools, accessible approvals and scrollable command output.
- Streamed Markdown, tables, syntax-highlighted code and copy buttons.
- Context capacity and percentage-used ring; automatic compaction and `/compact`.
- File, image and screenshot attachments; PDF page selection with images and extracted text. Unselected PDF pages are not included.
- Per-turn file diffs and guarded Undo for captured, eligible workspace files. Undo does not reverse shell commands, installs, services or Git history.
- A message input that grows from two to fourteen visual lines.

## Development

Install Node.js 24 and run `npm ci`, `npm test` and `npm run build`. The runtime bridge is vendored under `bridge-source/`; required upstream notices are in `THIRD_PARTY_NOTICES.md`.

Use **Build prebuilt runtimes** to build and integration-test Linux, Windows and Apple Silicon archives. Publish immutable runtime release assets, update their size/SHA-256 pins in `runtime-manifest.json`, then build extensions with `npm run package:platform -- win32-x64` (or `linux-x64` / `darwin-arm64`). Output defaults to `dist/`; an optional second argument selects another output directory.

Platform-specific extension packages include a verified runtime archive. Native runtime tests exercise streaming, reads, approved and denied writes, compaction, live permission changes and cancellation against a loopback mock model API.

### Shared chats over Remote SSH

Chats are saved on the extension host, separately for each workspace folder. When connecting from another device, use the same SSH user and open the same server folder to see the same conversations. Existing workspace-local chats are copied into host storage automatically; their originals remain intact. Different servers and local installations do not synchronise with one another. Simultaneous edits to one chat are checked to prevent stale windows overwriting newer messages.
