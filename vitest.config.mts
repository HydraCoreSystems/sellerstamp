import { defineConfig } from 'vitest/config';

// The core is plain logic with no native code, so it runs in node with no phone.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
