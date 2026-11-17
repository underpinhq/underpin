# @underpin/fetch

Downloads a URL on the server only when every address it reaches is public. Use it for any URL a user supplies, such as an image to import or a site's favicon, so the server cannot be tricked into fetching its own network (server-side request forgery).

```bash
bun add @underpin/fetch
```

Server-only: it runs on Node.js 22.12 or later, or Bun, and uses `node:http`, `node:https` and `node:dns`.

## Usage

```ts
import { downloadPublicUrl, DownloadTooLargeError, PrivateAddressError } from "@underpin/fetch"

const { body, contentType, url } = await downloadPublicUrl(userUrl, {
  maxBytes: 5 * 1024 * 1024,
  timeout: 10_000,
  headers: { accept: "image/*" },
})
```

`body` is a `Uint8Array`. `contentType` is the server's own header, so check the bytes before you trust it. `url` is the URL that answered, after redirects.

## What it checks

- **Every resolved address is public.** The check runs inside the connection's DNS lookup, and the connection uses the addresses it checked. A name that answers with a public address first and a private one later (DNS rebinding) cannot get past it. One private address among public ones fails the whole download.
- **IP literals, protocols and credentials.** `assertPublicUrl(url)` refuses a private IP host, any protocol other than http and https, and a user name or password in the URL. It runs before each request.
- **Redirects.** At most 3 by default (`maxRedirects`), followed by hand and checked like the first URL.
- **Size.** A declared `content-length` over `maxBytes` fails at once, and a streamed body stops as soon as it passes the cap. The request always asks for `accept-encoding: identity`, so nothing inflates after the count, on Node.js and on Bun.
- **Time.** `timeout` (30 seconds by default) covers the whole download, redirects included. `signal` aborts it early.

"Public" means outside every private, loopback, link-local, shared, reserved, multicast and documentation range, as `isPublicIp` from `@underpin/utils` defines it.

## Errors

| Error | When |
| --- | --- |
| `PrivateAddressError` | The URL, a redirect or a resolved address is not public |
| `DownloadTooLargeError` | The body passes `maxBytes` (its `maxBytes` field holds the limit) |
| `HttpStatusError` | The response is neither a success nor a redirect (its `status` field holds the code) |
| `Error` | A protocol or credentials check failed, there were too many redirects, or the network failed |

## License

MIT
