import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const base = process.env.GITHUB_ACTIONS ? '/squid/' : '/';

export default defineConfig({
  base,
  plugins: [tailwindcss(), tsconfigPaths(), TanStackRouterVite(), react()],
});
