# Testing Guide

This project uses a comprehensive testing stack for unit, integration, and E2E tests.

## Tech Stack

- **Vitest** - Unit & integration tests
- **React Testing Library** - Component testing
- **Playwright** - E2E tests
- **Supertest** - API integration tests

## Quick Start

### Install Dependencies

All testing dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Install Playwright Browsers

For E2E tests, install Chromium browser:

```bash
npx playwright install chromium --with-deps
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### Run All Tests

```bash
npm run test:all
```

## Project Structure

```
/src
  /test
    setup.ts              # Global test setup for Vitest
    test-utils.tsx        # Custom render utilities
  /lib
    utils.test.ts         # Example unit tests
  /components
    /ui
      button.test.tsx     # Example component tests

/e2e
  example.spec.ts         # Example E2E tests
  auth.spec.ts           # Authentication E2E tests

vitest.config.ts          # Vitest configuration
playwright.config.ts      # Playwright configuration
```

## Writing Tests

### Unit Tests (Vitest)

Place test files next to the code they test with `.test.ts` or `.spec.ts` extension.

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Component Tests (React Testing Library)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

Place E2E tests in the `/e2e` directory.

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
  
  await page.click('text=Login');
  await expect(page).toHaveURL(/\/login/);
});
```

## Best Practices

### Vitest

1. **Use `vi` for mocking**
   ```typescript
   import { vi } from 'vitest';
   const mockFn = vi.fn();
   ```

2. **Leverage setup files** - Global mocks are configured in `/src/test/setup.ts`

3. **Use inline snapshots** for better readability
   ```typescript
   expect(value).toMatchInlineSnapshot(`"expected"`);
   ```

4. **Focus on meaningful tests** - Don't chase coverage numbers

5. **Use watch mode during development**
   ```bash
   npm run test:watch
   ```

### React Testing Library

1. **Query by user-visible attributes**
   - Prefer: `getByRole`, `getByLabelText`, `getByText`
   - Avoid: `getByTestId`, `container.querySelector`

2. **Test user interactions**
   ```typescript
   const user = userEvent.setup();
   await user.click(button);
   await user.type(input, 'text');
   ```

3. **Wait for async updates**
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument();
   });
   ```

### Playwright

1. **Use Chromium only** (as per project guidelines)

2. **Leverage browser contexts** for isolation
   ```typescript
   const context = await browser.newContext();
   const page = await context.newPage();
   ```

3. **Use Page Object Model** for complex flows

4. **Implement proper locators**
   ```typescript
   await page.getByRole('button', { name: 'Submit' }).click();
   ```

5. **Use trace viewer for debugging**
   ```bash
   npm run test:e2e:debug
   ```

6. **Enable screenshots on failure** (already configured)

7. **Visual regression tests** with `toHaveScreenshot()`
   ```typescript
   await expect(page).toHaveScreenshot('page.png');
   ```

## Coverage

Coverage reports are generated in `/coverage` directory when running:

```bash
npm run test:coverage
```

Open `coverage/index.html` in your browser to view detailed coverage reports.

## CI/CD Integration

Tests are ready for CI/CD integration. Set `CI=true` environment variable for:
- Stricter test execution
- No test retries (Playwright)
- Sequential test execution (recommended for CI)

Example GitHub Actions:

```yaml
- name: Run unit tests
  run: npm test

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## Debugging

### Vitest

1. **VS Code**: Use the Vitest extension
2. **Chrome DevTools**: Run with `--inspect`
3. **UI Mode**: `npm run test:ui` for visual debugging

### Playwright

1. **UI Mode**: `npm run test:e2e:ui`
2. **Debug Mode**: `npm run test:e2e:debug`
3. **Trace Viewer**: View traces after failures
4. **Headed mode**: See browser in action
   ```bash
   npx playwright test --headed
   ```

## Common Issues

### E2E: "Timed out waiting from config.webServer"

**Problem**: Playwright nie może połączyć się z serwerem deweloperskim.

**Rozwiązanie**:
```bash
# Sprawdź czy port 4321 jest wolny
lsof -i :4321

# Jeśli zajęty, zabij proces
lsof -ti:4321 | xargs kill -9

# Upewnij się że astro.config.mjs ma: server: { port: 4321 }
```

### E2E: "EACCES: permission denied" w test-results

**Problem**: Katalog z wynikami testów ma złe uprawnienia.

**Rozwiązanie**:
```bash
# Usuń katalogi (może wymagać sudo)
sudo rm -rf test-results playwright-report

# Uruchom testy ponownie
npm run test:e2e
```

### Playwright browser installation fails

Run with sudo if needed:
```bash
sudo npx playwright install chromium --with-deps
```

### Tests fail in CI but pass locally

- Ensure `CI=true` is set
- Check for timing issues - use proper waits
- Verify database state between tests

### Component tests fail with "Not wrapped in act()"

Use `waitFor` or `findBy*` queries for async updates.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

