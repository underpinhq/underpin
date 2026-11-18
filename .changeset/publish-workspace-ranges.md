---
"@underpin/config": patch
---

`underpin publish` resolves `workspace:` ranges for a package that publishes from its own directory. It writes the siblings' versions into `package.json` for the publish, and restores the file afterwards. Before this fix, such a package reached npm with `workspace:^` in its dependencies, and every install outside the monorepo failed.
