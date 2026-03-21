# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-15

### Added
- MCP server (`md-anything-mcp`) with `convert`, `ingest`, and `doctor` tools
- `--json` output flag for agent-friendly machine-readable output
- `mda mcp install` command for Claude Desktop, Cursor, and Windsurf setup
- `mda doctor` capability report with upgrade suggestions
- Claude Code plugin with SKILL.md and slash commands
- Cross-platform binary builds (macOS arm64/x64, Linux x64, Windows x64)
- `install.sh` for curl-based installation
- MCP safety model: workspace containment, private URL blocking, structured errors
- OpenRouter opt-in fallback for image VL and audio/video transcription
- EPUB extraction via unzip
- MOBI/AZW extraction via Calibre's ebook-convert

### Changed
- Simplified architecture to CLI + MCP only (removed HTTP API and graph features)
- Replaced openai-whisper with whisper-cpp as primary transcription backend
- Agent-optimized YAML frontmatter with provenance and usefulness scoring

### Security
- Fixed shell command injection vulnerability in all providers (execSync → spawnSync)
- Added checksum verification to install.sh
- Added .env.example with documented environment variables

## [0.1.0] - 2025-12-01

### Added
- Initial CLI (`mda`) for converting files and URLs to Markdown
- Support for text, markdown, JSON, HTML, PDF, image, YouTube, URL inputs
- Structured extraction with sections and provenance tracking
- Batch folder ingestion with `-r` and `-o` flags
- PDF extraction via unpdf with pdftotext fallback
- Image OCR via tesseract with OpenRouter VL fallback
- YouTube transcript extraction
- CI/CD pipeline with GitHub Actions
- Basic test suite
