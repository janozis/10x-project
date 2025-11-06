# E2E Testing Setup Guide

## Initial Setup

### 1. Configure Environment Variables

Create a `.env.test` file in the project root:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` and fill in your test credentials:

```env
E2E_USERNAME_ID=your-test-user-uuid
E2E_USERNAME=test@example.com
E2E_PASSWORD=your-test-password
BASE_URL=http://localhost:4321
STORAGE_STATE=e2e/.auth/user.json
```

**Important**: Make sure you have a test user created in your database with these credentials.

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Verify Setup

Run a quick test to verify everything is configured:

```bash
npm run test:e2e -- auth.setup.ts
```

You should see: `✓ Authentication successful`

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `E2E_USERNAME_ID` | Test user's UUID from database | `123e4567-e89b-12d3-a456-426614174000` |
| `E2E_USERNAME` | Test user's email | `test@example.com` |
| `E2E_PASSWORD` | Test user's password | `SecurePass123!` |
| `BASE_URL` | Application URL for tests | `http://localhost:4321` |
| `STORAGE_STATE` | Path to save auth state | `e2e/.auth/user.json` |
| `SUPABASE_URL` | **Test database URL** | Your test Supabase URL |
| `SUPABASE_ANON_KEY` | **Test database key** | Your test Supabase anon key |

**⚠️ WAŻNE:** `.env.test` powinien zawierać **wszystkie** zmienne środowiskowe z `.env`, ale wskazujące na testową bazę danych/środowisko. Testy uruchamiają serwer z `.env.test`, więc aplikacja łączy się z testową bazą.

## How Authentication Works

1. **Dev Server with Test Environment**:
   - Playwright starts server with `npm run dev:test`
   - Server uses **all variables from `.env.test`**
   - Application connects to **test database**
   - Prevents contaminating development/production data

2. **Setup Phase** (`auth.setup.ts`):
   - Runs once before all tests
   - Logs in with `E2E_USERNAME` and `E2E_PASSWORD`
   - Saves authentication state to `e2e/.auth/user.json`

3. **Test Phase**:
   - Tests reuse the saved authentication state
   - No need to log in for each test
   - Faster test execution

4. **Unauthenticated Tests**:
   - Override storage state: `test.use({ storageState: { cookies: [], origins: [] } })`

## Creating Test Users

### Option 1: Via Application UI

1. Start the dev server: `npm run dev`
2. Navigate to registration: `http://localhost:4321/auth/register`
3. Create a test account
4. Copy credentials to `.env.test`

### Option 2: Via Supabase Dashboard

1. Open Supabase dashboard
2. Go to Authentication > Users
3. Click "Add user"
4. Set email and password
5. Copy credentials to `.env.test`

### Option 3: Via Database

```sql
-- Create test user (adjust as needed)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('your-password', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

## Page Object Model

Tests use the Page Object Model pattern for maintainability:

```typescript
// Import page objects
import { LoginPage } from './page-objects';

test('should login', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Act
  await loginPage.loginWithTestUser();

  // Assert
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### Available Page Objects

- `LoginPage` - Login page interactions
- `DashboardPage` - Dashboard navigation
- More to be added as needed

## Best Practices

### 1. Use AAA Pattern

```typescript
test('should do something', async ({ page }) => {
  // Arrange - Set up test data and page objects
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Act - Perform the action
  await loginPage.login('test@example.com', 'password');

  // Assert - Verify the outcome
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### 2. Use data-testid for Stable Selectors

When semantic selectors aren't sufficient:

```html
<!-- In component -->
<button data-testid="submit-activity">Submit</button>
```

```typescript
// In test
await page.getByTestId('submit-activity').click();
```

### 3. Isolate Tests with Browser Contexts

```typescript
test('should isolate data', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Test code...
  
  await context.close();
});
```

### 4. Use Setup Hooks

```typescript
test.beforeEach(async ({ page }) => {
  // Arrange - Common setup for all tests
  await page.goto('/activities');
});

test.afterEach(async ({ page }) => {
  // Cleanup after each test
});
```

## Troubleshooting

### "E2E_USERNAME and E2E_PASSWORD must be set"

- Make sure `.env.test` file exists
- Verify the file contains `E2E_USERNAME` and `E2E_PASSWORD`
- Check that the file is in the project root (not in `/e2e`)

### "Authentication failed"

- Verify credentials are correct
- Check that the test user exists in the database
- Ensure the user's email is verified (if required)

### "Port 4321 is already in use"

```bash
# Kill existing process
lsof -ti:4321 | xargs kill -9

# Or change port in .env.test
BASE_URL=http://localhost:3000
```

### Permission Errors

```bash
# Clean test artifacts
sudo rm -rf test-results playwright-report e2e/.auth

# Re-run tests
npm run test:e2e
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test auth-pom.spec.ts

# Run with UI (recommended for development)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Run only setup
npx playwright test auth.setup.ts
```

## CI/CD Integration

Set environment variables in your CI:

```yaml
env:
  E2E_USERNAME_ID: ${{ secrets.E2E_USERNAME_ID }}
  E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
  E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
  CI: true
```

## Security Notes

⚠️ **Never commit `.env.test` to version control**

- `.env.test` is already in `.gitignore`
- Use `.env.test.example` as a template
- Store credentials securely (use CI secrets for production)
- Use dedicated test accounts, not production users

