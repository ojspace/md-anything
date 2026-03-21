#!/usr/bin/env bash
set -euo pipefail

REPO="ojspace/md-anything"
BINARY_NAME="mda"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  darwin)
    case "$ARCH" in
      arm64)   ASSET="mda-macos-arm64" ;;
      x86_64)  ASSET="mda-macos-x64" ;;
      *) echo "Unsupported macOS architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  linux)
    case "$ARCH" in
      x86_64)  ASSET="mda-linux-x64" ;;
      *) echo "Unsupported Linux architecture: $ARCH"; exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $OS"
    echo "For Windows, download mda-windows-x64.exe from:"
    echo "  https://github.com/$REPO/releases/latest"
    exit 1
    ;;
esac

# Get latest release tag
echo "Detecting latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep '"tag_name"' \
  | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')

if [ -z "$TAG" ]; then
  echo "Failed to detect latest release."
  echo "Check: https://github.com/$REPO/releases"
  exit 1
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$TAG/$ASSET"
CHECKSUMS_URL="https://github.com/$REPO/releases/download/$TAG/checksums.txt"
echo "Downloading md-anything $TAG ($ASSET)..."

TMP=$(mktemp)
curl -fsSL "$DOWNLOAD_URL" -o "$TMP"

# Verify checksum if checksums file is available
CHECKSUMS=$(mktemp)
if curl -fsSL "$CHECKSUMS_URL" -o "$CHECKSUMS" 2>/dev/null; then
  echo "Verifying checksum..."
  EXPECTED=$(grep "$ASSET" "$CHECKSUMS" | awk '{print $1}')
  if [ -n "$EXPECTED" ]; then
    if command -v sha256sum &> /dev/null; then
      ACTUAL=$(sha256sum "$TMP" | awk '{print $1}')
    else
      ACTUAL=$(shasum -a 256 "$TMP" | awk '{print $1}')
    fi
    if [ "$EXPECTED" != "$ACTUAL" ]; then
      echo "ERROR: Checksum mismatch!"
      echo "  Expected: $EXPECTED"
      echo "  Actual:   $ACTUAL"
      rm -f "$TMP" "$CHECKSUMS"
      exit 1
    fi
    echo "Checksum verified."
  fi
else
  echo "Warning: checksums.txt not found in release, skipping verification."
fi
rm -f "$CHECKSUMS"

chmod +x "$TMP"

# Move to install directory (uses sudo if needed)
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP" "$INSTALL_DIR/$BINARY_NAME"
else
  echo "Installing to $INSTALL_DIR (requires sudo)..."
  sudo mv "$TMP" "$INSTALL_DIR/$BINARY_NAME"
fi

echo ""
echo "md-anything $TAG installed → $INSTALL_DIR/$BINARY_NAME"
echo ""
echo "Get started:"
echo "  mda --help"
echo "  mda doctor"
echo "  mda mcp install claude"
