# Architecture

VS Code webview → workspace extension host → local JSONL adapter → Lodex bridge → DeepSeek Harness → model API.

The workspace extension runs locally or on the Remote SSH host. The bridge is vendored and versioned with Lodex. DeepSeek Harness 0.2.1-rc.5 runs in a separate local process. Inference requests go to the configured endpoint.

Saved chats use per-workspace VS Code storage. Connection profiles and API keys use SecretStorage. Eligible filesystem checkpoints supply per-turn diffs and guarded Undo; secrets, symlinks, large files, dirty editor buffers and common build/dependency directories are excluded. Checkpoints have scan and storage limits.

Native runtime archives are verified by size and SHA-256 before extraction. Extraction uses staging and preserves earlier runtimes. Release bundles contain software only. Third-party licence notices must be retained.
