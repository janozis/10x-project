# E2E Testing with Playwright

## Quick Start

### First Time Setup

1. **Install Chromium browser**:
```bash
npx playwright install chromium
```

2. **Ensure port 4321 is free** (Astro dev server port):
```bash
lsof -ti:4321 | xargs kill -9
```

3. **Run tests**:
```bash
npm run test:e2e
```

## Common Issues

### Issue: "Timed out waiting from config.webServer"

**Cause**: Astro dev server is not starting on the expected port (4321).

**Solution**:
- Check if port 4321 is available: `lsof -i :4321`
- Kill any process using that port: `lsof -ti:4321 | xargs kill -9`
- Verify Astro config has `server: { port: 4321 }` in `astro.config.mjs`

### Issue: "EACCES: permission denied" on test-results

**Cause**: Test results directory has incorrect permissions (possibly created with sudo).

**Solution**:
```bash
# Remove the directory (may need sudo)
sudo rm -rf test-results playwright-report

# Run tests again - directories will be recreated with correct permissions
npm run test:e2e
```

### Issue: "Executable doesn't exist"

**Cause**: Playwright browsers are not installed.

**Solution**:
```bash
npx playwright install chromium
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed
```

## Writing Tests

See example tests in this directory:
- `example.spec.ts` - Basic examples
- `auth.spec.ts` - Authentication flow examples

## Tips

1. **Use Page Object Model** for complex flows
2. **Leverage locators** - prefer `getByRole`, `getByLabel` over CSS selectors
3. **Wait properly** - Playwright auto-waits, but use `waitFor` when needed
4. **Debug with UI mode** - `npm run test:e2e:ui` is your friend
5. **Check traces** after failures for detailed debugging

## CI/CD

Set `CI=true` environment variable for CI runs:
```bash
CI=true npm run test:e2e
```

This will:
- Disable test retries
- Run tests sequentially
- Use stricter timeouts

