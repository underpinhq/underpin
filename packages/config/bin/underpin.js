#!/usr/bin/env node
// The bin entry is a committed file, so a package manager links it at install time even in a
// workspace whose `dist` is not built yet. It runs the CLI that `tsc` builds into `dist`.
import "../dist/cli/underpin.js"
