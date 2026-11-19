---
name: formatting
description: Code formatting and style rules not handled by auto-formatters (oxfmt). Use when writing or modifying TypeScript/React code. Covers function declarations, exports, types, comments, JSX, naming conventions, import patterns, and reusing shared helpers before writing one.
---

# Code Formatting Rules

Style guide for code formatting decisions not handled by auto-formatters (oxfmt).

## 1. Function Declaration Style

Use `function` declarations for named functions: components, hooks, utilities,
route handlers, and local helpers inside a function body. Reserve arrow
functions for inline callbacks passed as arguments. A function stays an arrow
`const` only when the variable carries a type annotation (`const handler: Handler = ...`)
or when a hoisted declaration would lose type narrowing from the enclosing scope.

```typescript
// Correct
export function processData(input: string): string {
  return `Processed: ${input}`
}

// Correct — inline callback stays an arrow
const ids = users.map(user => user.id)

// Avoid — named function written as an arrow const
export const processData = (input: string): string => {
  return `Processed: ${input}`
}
```

---

## 2. Export Patterns

Use named exports only. Never use default exports, except where a framework
requires them (Next.js `page`, `layout`, `route` metadata files, and config files).
Export at the declaration, never through a trailing `export { … }` block. The only
allowed `export { … } from` is a re-export from another module.

```typescript
// Correct
export function Button() {
  return <button>Click me</button>
}

// Avoid
function Button() {
  return <button>Click me</button>
}
export default Button
```

---

## 3. Early Returns

Use early returns for validation and edge cases to keep the main logic flat.
Always brace the body of `if`, `else`, `for`, and `while`, with the body on its
own line, even for a single `return`.

```typescript
// Correct
export function processUser(user: User | null) {
  if (!user) {
    return
  }

  if (!user.isActive) {
    return
  }

  return doSomething(user)
}

// Avoid: unbraced one-line guard
if (!user) return
```

---

## 4. Type Definitions

Use `interface` for every object shape, including component props. Compose
shapes with `extends`, not `&`: an interface reports conflicting members, while an
intersection silently merges them into an unusable type. Use `type` only for
unions, function types, mapped and conditional types, and aliases of a single
existing type. Group related types under a namespace.

```typescript
// Correct
export interface User {
  id: string
  name: string
}

// Correct: props extend the element and variant props
interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  isPending?: boolean
}

// Correct: a member that conflicts with the base is omitted first
interface CardProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode
}

// Avoid: object shape as a `type` alias
export type User = {
  id: string
  name: string
}

// Avoid: props composed with an intersection
type ButtonProps = ComponentProps<"button"> & {
  isPending?: boolean
}

// `type` is still correct for unions, function types, and mapped types
export type Status = "active" | "archived"

// Namespaces for related types
export namespace UserApi {
  export interface Request {
    userId: string
  }
  export interface Response {
    user: User
  }
}
```

---

## 5. File Structure

Follow a standard file order to maintain consistency across the codebase:
1. Imports (grouped: builtin, external, internal)
2. Shared type definitions
3. Constants and Helpers
4. Main exports (Components/Functions)

A type used by a single declaration sits directly above that declaration, so
each component's props interface stays next to the component. Only types shared
by several declarations go in the type section after the imports.

---

## 6. Curly Braces

Function declarations always use a braced body with an explicit `return`.
Trivial inline callbacks may stay in concise (shorthand) form.

```typescript
// Correct — declaration has a braced body
export function getName(user: User) {
  return user.name
}

// Correct — trivial inline callback stays concise
const ids = users.map(user => user.id)

// Avoid — pointless braces and return on a trivial callback
const ids = users.map(user => {
  return user.id
})
```

---

## 7. Variable Naming

Use full, descriptive words. Avoid abbreviations like `err`, `req`, `res`, or `btn`.
This includes callback parameters and loop variables: `event` not `e`, `error`
not `err`, `index` not `i`, `previous` not `prev`, and the item's name
(`tool`, `category`) not its first letter. The only exception is `t` for an
i18n translation function, which is a near-universal convention.

```typescript
// Correct
const error = new Error("Failed")
const request = await fetch(url)
const button = document.querySelector("button")

// Avoid
const err = new Error("Failed")
const req = await fetch(url)
const btn = document.querySelector("button")
```

**Function name prefixes:**
- `parse*` (e.g., `parseInput`)
- `generate*` (e.g., `generateId`)
- `get*` / `fetch*` (e.g., `getUser`)
- `is*` / `has*` (e.g., `isValid`, `hasPermission`)
- `validate*` (e.g., `validateEmail`)

---

## 8. Comments

Write comments as full sentences with proper capitalization and punctuation. Place them above the subject.

```typescript
// Correct
// This calculates the final price including tax and discounts.
const finalPrice = calculatePrice(items)

// Avoid
const finalPrice = calculatePrice(items) // calculate price
```

**Inline comments** are allowed for arrays, object properties, and complex types:
```typescript
export interface Config {
  timeout: number // Timeout in milliseconds.
  retries: number // Number of retry attempts.
}
```

Comments describe what the code does and why, **timelessly**. Never reference
issue or ticket IDs (`ANA-10`, `#128`), the development process, or internal
narrative — no "we decided", "for now", "smoke test", or tool/agent markers
like `ponytail:`. A comment must read the same a year later to someone who
never saw the change that introduced it.

```typescript
// Correct
// Both credentials unset disables telemetry; errors still go to stdout.

// Avoid
// Observability (ANA-10). ponytail: one endpoint, low-volume for now.
```

---

## 9. Array Type Syntax

Use the `T[]` shorthand instead of the generic `Array<T>` syntax.

```typescript
// Correct
const tags: string[] = ["react", "typescript"]

// Avoid
const tags: Array<string> = ["react", "typescript"]
```

---

## 10. Nullish Coalescing

Use the nullish coalescing operator `??` instead of logical OR `||` for default values.

```typescript
// Correct
const port = process.env.PORT ?? 3000
const username = user.name ?? "Anonymous"

// Avoid
const port = process.env.PORT || 3000
```

---

## 11. Template Literals

Always use template literals for string composition. Never use `+` for string concatenation.

```typescript
// Correct
const message = `Hello, ${user.name}!`

// Avoid
const message = "Hello, " + user.name + "!"
```

---

## 12. Bare Return

When a function returns `| undefined`, use a bare `return` instead of `return undefined`.

```typescript
// Correct
export function findItem(items: Item[], id: string): Item | undefined {
  const item = items.find(i => i.id === id)
  if (!item) return
  return item
}

// Avoid
if (!item) return undefined
```

---

## 13. Void Prefix

Use the `void` operator for intentionally non-awaited async calls (fire-and-forget).

```typescript
// Correct
void trackEvent("page_view")

// Avoid
trackEvent("page_view")
```

---

## 14. Empty Catch

Use an empty `catch {}` block for expected or ignorable failures, and return a safe default.

```typescript
export function safeParseJson(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {}
}
```

---

## 15. Config via Constants

Isolate all `process.env` access in dedicated constants or environment modules. Business logic should never touch `process.env`.

```typescript
// Correct (in ~/lib/env.ts)
export const DATABASE_URL = process.env.DATABASE_URL

// Avoid (in business logic)
const client = new Client(process.env.DATABASE_URL)
```

---

## 16. JSX Attributes

Order attributes logically: `key` and `ref` first, then `id`, then standard props, then `className`, and finally event handlers (`on*`). Never move an attribute across a `{...spread}`, because a spread overrides the attributes before it.

```tsx
// Correct
<Button
  id="submit-btn"
  type="submit"
  disabled={isLoading}
  className="w-full bg-blue-500"
  onClick={handleSubmit}
>
  Submit
</Button>
```

---

## 17. Conditionals

Never nest ternaries. Use a lookup object, a helper function with early returns,
or separate conditions. Compare with `===` and `!==` only, including against
`null` and `undefined`.

```typescript
// Correct
const linkTitle = isEditing ? "Edit link" : "Insert link"
const title = mode === "image" ? "Insert image" : linkTitle

// Avoid
const title = mode === "image" ? "Insert image" : isEditing ? "Edit link" : "Insert link"
```

---

## 18. Path Aliases

Always use `~/*` path aliases for imports. Never use relative paths like `./` or `../`.

```typescript
// Correct
import { Button } from "~/components/ui/button"

// Avoid
import { Button } from "../../components/ui/button"
```

---

## 19. TypeScript Strict

Maintain strict TypeScript usage. Never use `any`. Use `unknown` if the type is truly unknown, or define a specific type/interface.

```typescript
// Correct
export function handleData(data: unknown) {
  if (typeof data === "string") {
    return data.toUpperCase()
  }
}

// Avoid
export function handleData(data: any) {
  return data.toUpperCase()
}
```

---

## 20. Reuse Before Writing a Helper

Before writing a generic helper (formatting a count or a date, initials, slugs, byte sizes, array grouping, URL handling), check the utility packages the repo already depends on. A search of the repo's own source never reaches them. List the package's exports from its entry type file and look for the job you need:

```bash
cat node_modules/@underpin/utils/dist/index.d.ts
```

In Piotr's repos `@underpin/utils` comes first. A repo that has not moved to it yet still imports the same helpers from the deprecated `@dirstack/utils`. A generic helper it lacks goes upstream into it, not into a local copy, unless the repo's agent docs say otherwise.

```typescript
// Correct
import { getInitials } from "@underpin/utils"
const initials = getInitials(name, 2)

// Avoid
const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase()).join("")
```
