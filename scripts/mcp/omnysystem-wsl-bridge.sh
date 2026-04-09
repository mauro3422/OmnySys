#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WINDOWS_NODE="${OMNYSYS_WINDOWS_NODE_PATH:-/mnt/c/Program Files/nodejs/node.exe}"
BRIDGE_JS="${PROJECT_ROOT}/src/layer-c-memory/mcp-stdio-bridge.js"

if [[ ! -x "${WINDOWS_NODE}" ]]; then
  echo "OmnySys WSL bridge launcher could not find Windows node.exe at: ${WINDOWS_NODE}" >&2
  exit 1
fi

if [[ ! -f "${BRIDGE_JS}" ]]; then
  echo "OmnySys WSL bridge launcher could not find bridge script at: ${BRIDGE_JS}" >&2
  exit 1
fi

WINDOWS_BRIDGE_JS="$(wslpath -w "${BRIDGE_JS}")"
WINDOWS_PROJECT_ROOT="$(wslpath -w "${PROJECT_ROOT}")"

export OMNYSYS_PROJECT_PATH="${WINDOWS_PROJECT_ROOT}"

exec "${WINDOWS_NODE}" "${WINDOWS_BRIDGE_JS}"
