# E2E Testing with Playwright

## Quick Start

### First Time Setup

1. **Configure test environment**:
   - Copy `.env.test.example` to `.env.test` (if not exists)
   - Fill in your test Supabase credentials
   - Set test user IDs (see [SETUP.md](./SETUP.md) for details)

2. **Install Chromium browser**:
```bash
npx playwright install chromium
```

3. **Ensure port 4321 is free** (Astro dev server port):
```bash
lsof -ti:4321 | xargs kill -9
```

4. **Run tests**:
```bash
npm run test:e2e
```

> **Note:** Tests automatically clean up test data after completion. See [TEARDOWN.md](./TEARDOWN.md) for details.

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
- `example-group-creation.spec.ts` - Best practices with unique data generation

### Best Practices

#### 1. Always Use Unique Names for Entities

**❌ BAD - Hardcoded names cause test conflicts:**
```typescript
await page.getByTestId('groups-create-name-input').fill('Moja grupa');
await page.getByTestId('groups-create-submit-button').click();
```

**✅ GOOD - Generate unique names:**
```typescript
import { generateGroupData } from './test-helpers';

const groupData = generateGroupData({
  description: 'Test group for E2E verification'
});

await page.getByTestId('groups-create-name-input').fill(groupData.name);
await page.getByTestId('groups-create-submit-button').click();

// Verify by unique name
await expect(page.getByText(groupData.name)).toBeVisible();
```

#### 2. Use Test Helpers

The `test-helpers.ts` file provides utilities for generating unique test data:

```typescript
import { 
  generateUniqueEmail,
  generateUniqueGroupName,
  generateGroupData,
  generateActivityData,
  generateTaskData,
  getFutureDate,
  getPastDate
} from './test-helpers';

// Generate unique email
const email = generateUniqueEmail('testuser');

// Generate unique group name
const groupName = generateUniqueGroupName('My Test Group');

// Generate complete group data with overrides
const groupData = generateGroupData({
  description: 'Custom description',
  startDate: getFutureDate(7),
  endDate: getFutureDate(14),
  maxMembers: 30
});
```

#### 3. Use Page Object Model

Import Page Objects from centralized location:

```typescript
import { 
  LoginPage,
  GroupsListPage, 
  CreateGroupDialog,
  ActivityFormPage 
} from './page-objects';

const loginPage = new LoginPage(page);
const groupsPage = new GroupsListPage(page);
const createDialog = new CreateGroupDialog(page);
```

#### 4. Verify Entity Creation

Always verify that the created entity appears with its unique name:

```typescript
const groupData = generateGroupData();
await createDialog.createGroup(groupData);
await createDialog.waitForClose();

// Verify by unique name
await expect(page.getByText(groupData.name)).toBeVisible();
```

## Tips

1. **Use Page Object Model** for complex flows
2. **Generate unique data** - use `test-helpers.ts` to avoid conflicts
3. **Verify by unique identifiers** - check entity exists by its unique name
4. **Leverage locators** - prefer `getByRole`, `getByLabel`, `getByTestId` over CSS selectors
5. **Wait properly** - Playwright auto-waits, but use `waitFor` when needed
6. **Debug with UI mode** - `npm run test:e2e:ui` is your friend
7. **Check traces** after failures for detailed debugging

## Database Cleanup

After all tests complete, the global teardown automatically cleans up test data:

✅ **What gets cleaned:**
- Groups created by test users
- Activities in those groups
- Camp days, schedules, tasks, etc.

❌ **What stays:**
- Test users (reused across runs)

See [TEARDOWN.md](./TEARDOWN.md) for complete documentation.

## Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[TEARDOWN.md](./TEARDOWN.md)** - Database cleanup documentation
- **[E2E-CHECKLIST.md](./E2E-CHECKLIST.md)** - Test coverage checklist

## CI/CD

Set `CI=true` environment variable for CI runs:
```bash
CI=true npm run test:e2e
```

This will:
- Disable test retries
- Run tests sequentially
- Use stricter timeouts

Required environment variables for CI:
```yaml
E2E_USERNAME_ID: ${{ secrets.E2E_USERNAME_ID }}
E2E_2_USERNAME_ID: ${{ secrets.E2E_2_USERNAME_ID }}
SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

