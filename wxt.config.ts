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
    // The settings page is a full-width view; the embedded chrome://extensions
    // modal is cramped and failed to open at all for some users.
    options_ui: { page: 'options.html', open_in_tab: true },
  },
});
