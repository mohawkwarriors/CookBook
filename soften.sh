#!/bin/bash
find src -name "*.tsx" -type f -exec sed -i \
  -e 's/dark:bg-neutral-800/dark:bg-neutral-700/g' \
  -e 's/dark:bg-neutral-900/dark:bg-neutral-800/g' \
  -e 's/dark:bg-neutral-950/dark:bg-neutral-900/g' \
  -e 's/dark:border-neutral-700/dark:border-neutral-600/g' \
  -e 's/dark:border-neutral-800/dark:border-neutral-700/g' \
  -e 's/dark:text-white/dark:text-neutral-50/g' \
  {} +
