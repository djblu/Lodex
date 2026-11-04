# Changelog

## 1.0.0 — 2026-11-02

Initial Lodex release.

- Coding harness with configurable model endpoints, local and Remote SSH workspaces.
- Saved chats, context meter, compaction, tool approvals and file-change summaries.
- Image and PDF attachments, streamed Markdown and syntax-highlighted code.
- Bundled DeepSeek Harness 0.2.1-rc.5 for Windows x64, Linux x64 and Apple Silicon.

### Package refresh — 2026-11-04

- Use the monochrome Lodex mark in the VS Code activity bar.
- Resize the Extensions listing icon to meet Marketplace limits.
- Store chats on the extension host per workspace folder, with migration from existing device-local state.
- Protect shared chats against stale writes and preserve deletions across devices.
