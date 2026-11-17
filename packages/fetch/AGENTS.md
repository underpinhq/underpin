# @underpin/fetch

A guarded server-side download. Repo-wide rules (checks, changesets, releasing) are in the root `AGENTS.md`.

- **The address check stays in the connection's `lookup`.** A check before the request would let DNS rebinding through. The `lookup` must hand the connection only the addresses it checked.
- **Tests never reach a network.** `download()` takes a `Guard` (the resolver and the address rule). The tests point names at a loopback server and treat 127.0.0.1 as the only public address.
- **Keep `accept-encoding: identity`.** Bun and Node.js both return raw bytes from `node:http`, so the byte cap counts what arrives. Switching to `fetch` would bring back automatic decompression in Bun.
- **Every export carries an explicit type.** `isolatedDeclarations` is on.
