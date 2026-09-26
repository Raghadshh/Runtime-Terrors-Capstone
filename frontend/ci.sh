#!/usr/bin/env bash
set -euo pipefail

npm ci --prefix frontend
npm run typecheck --prefix frontend
