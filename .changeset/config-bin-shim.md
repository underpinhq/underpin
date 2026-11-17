---
"@underpin/config": patch
---

The `underpin` and `kodeks` bins point at a committed `bin/underpin.js`, which loads the built CLI. A package manager now links them at install time even in a workspace that builds the package from source, where `dist` does not exist yet.
