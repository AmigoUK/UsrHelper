import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  extensionApi: 'chrome',
  vite: () => ({ plugins: [preact()] }),
  manifest: {
    name: 'UsrHelper',
    description:
      'Deployment feedback helper: annotated screenshots and voice screencasts, saved locally or shared via email.',
    permissions: ['activeTab', 'tabs', 'downloads', 'storage', 'scripting'],
    host_permissions: ['<all_urls>'],
  },
});
