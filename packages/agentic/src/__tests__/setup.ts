/**
 * Jest test setup configuration
 *
 * This file is run before each test file to set up the testing environment
 * and configure environment variables for faster test execution.
 */

// Set NODE_ENV to test for all tests
process.env.NODE_ENV = 'test';

// Set test-specific limits to speed up integration tests
process.env.TEST_MOVIE_LIMIT = '3';
process.env.SCRAPPING_LIMIT = '5';

// Set a shorter log level for tests to reduce noise
if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'warn';
}

// Log test environment setup (only once)
if (!(global as any).testSetupLogged) {
  console.log('🧪 Test environment configured:', {
    NODE_ENV: process.env.NODE_ENV,
    TEST_MOVIE_LIMIT: process.env.TEST_MOVIE_LIMIT,
    SCRAPPING_LIMIT: process.env.SCRAPPING_LIMIT,
    LOG_LEVEL: process.env.LOG_LEVEL,
    JEST_WORKER_ID: process.env.JEST_WORKER_ID || 'main',
  });
  (global as any).testSetupLogged = true;
}
