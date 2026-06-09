# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> @smoke happy path >> register a new account
- Location: global-tests\smoke.spec.ts:18:7

# Error details

```
Error: locator.fill: Target page, context or browser has been closed
Call log:
  - waiting for getByLabel('Nombre de usuario')

```

```
Error: browserContext.close: Target page, context or browser has been closed
```