#!/usr/bin/env bash

set -euo pipefail

WINDOWS_GIT='C:\Program Files\Git\cmd\git.exe'
WINDOWS_REPO='C:\Dev\OmnySystem'

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <git-args...>" >&2
  exit 1
fi

args=()
for arg in "$@"; do
  args+=("'${arg//\'/\'\'}'")
done

command="& '$WINDOWS_GIT' -C '$WINDOWS_REPO' ${args[*]}"
exec powershell.exe -NoProfile -Command "$command"
