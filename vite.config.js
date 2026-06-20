import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg', 'apple-touch-icon.png'],
            manifest: {
                name: 'SmileMax',
                short_name: 'SmileMax',
                description: 'Maximise your credit card miles in Singapore',
                theme_color: '#4F46E5',
                background_color: '#f9fafb',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                // Cache app shell assets (JS, CSS, HTML)
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                // Don't cache Supabase API calls
                navigateFallback: 'index.html',
                navigateFallbackDenylist: [/^\/api\//],
                // Purge precaches from previous deploys and let the newest SW take
                // over immediately — prevents blank screens from a stale index.html
                // pointing at JS chunks that no longer exist.
                cleanupOutdatedCaches: true,
                skipWaiting: true,
                clientsClaim: true,
            },
        }),
    ],
});
