import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Building for production
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                profile: resolve(__dirname, 'profile.html'),
                privacy: resolve(__dirname, 'privacy.html')
            }
        }
    }
});
