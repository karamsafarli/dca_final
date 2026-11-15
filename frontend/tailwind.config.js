/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/**
 * Semantic design tokens. Values live in src/index.css (:root = light,
 * .dark = dark) so every component themes itself without `dark:` variants.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        subtle: token('subtle'),
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        fg: token('fg'),
        muted: token('muted'),
        faint: token('faint'),
        ink: { DEFAULT: token('ink'), fg: token('ink-fg') },
        danger: { DEFAULT: token('danger'), fg: token('danger-fg') },
        success: { DEFAULT: token('success'), fg: token('success-fg') },
        warning: { DEFAULT: token('warning'), fg: token('warning-fg') },
        priority: { DEFAULT: token('priority'), fg: token('priority-fg') },
        info: { DEFAULT: token('info'), fg: token('info-fg') },
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem' },
    },
  },
  plugins: [],
};
