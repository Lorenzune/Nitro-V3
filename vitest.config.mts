import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Test runner config — kept separate from vite.config.mjs because the
 * dev/build config wires up the renderer SDK via filesystem aliases that
 * point at sibling working trees (`../renderer`, `../Nitro_Render_V3`).
 * Tests are deliberately written against pure modules (helpers, stores)
 * that don't pull in the renderer.
 */
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: false,
        include: [ 'tests/**/*.test.ts', 'tests/**/*.test.tsx' ],
        setupFiles: [ './tests/setup.ts' ],
        css: false
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
});
