import { defineConfig, Plugin } from 'vitest/config';

function angularInlinePlugin(): Plugin {
  return {
    name: 'angular-inline-plugin',
    transform(code: string, id: string) {
      if (id.endsWith('.ts') && !id.endsWith('.spec.ts')) {
        return {
          code: code
            .replace(/templateUrl:\s*['"][^'"]+['"]/g, 'template: ""')
            .replace(/styleUrls:\s*\[[^\]]*\]/g, 'styles: []'),
          map: null
        };
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [angularInlinePlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    server: {
      deps: {
        inline: ['@ionic/angular', '@ionic/core']
      }
    }
  },
  resolve: {
    alias: {
      '@ionic/core/loader': '@ionic/core/loader/index.js'
    }
  }
});
