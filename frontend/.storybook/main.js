import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { mergeConfig } from 'vite'

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-onboarding"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-vitest"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  staticDirs: ['../public'], // Serve mockServiceWorker.js from public folder
  async viteFinal(config) {
    return mergeConfig(config, {
      // Ensure the same Vite plugins are used as in vite.config.ts
      css: {
        postcss: null, // Disable PostCSS since we're using @tailwindcss/vite
      },
    })
  },
}

export default config

function getAbsolutePath(value) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
