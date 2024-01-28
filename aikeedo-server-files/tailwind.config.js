const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./resources/**/*"],
  darkMode: ['class', '[data-mode="dark"]'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        md: "1.5rem"
      }
    },
    extend: {
      screens: {
        'xs': '375px',
      },
      colors: {
        "main": 'rgb(var(--color-main) / <alpha-value>)',
        "content": 'rgb(var(--color-content) / <alpha-value>)',
        "content-dimmed": 'rgb(var(--color-content-dimmed) / <alpha-value>)',
        "line": 'rgb(var(--color-line) / <alpha-value>)',
        "line-dimmed": 'rgb(var(--color-line-dimmed) / <alpha-value>)',

        "accent": 'rgb(var(--color-accent) / <alpha-value>)',
        "accent-content": 'rgb(var(--color-accent-content) / <alpha-value>)',

        "button": 'rgb(var(--color-button) / <alpha-value>)',
        "button-content": 'rgb(var(--color-button-content) / <alpha-value>)',

        "intermediate": 'rgb(var(--color-intermediate) / <alpha-value>)',
        "intermediate-content": 'rgb(var(--color-intermediate-content) / <alpha-value>)',
        "intermediate-content-dimmed": 'rgb(var(--color-intermediate-content-dimmed) / <alpha-value>)',

        "gradient-from": 'rgb(var(--color-gradient-from) / <alpha-value>)',
        "gradient-to": 'rgb(var(--color-gradient-to) / <alpha-value>)',

        "info": 'rgb(var(--color-info) / <alpha-value>)',
        "success": 'rgb(var(--color-success) / <alpha-value>)',
        "failure": 'rgb(var(--color-failure) / <alpha-value>)',
        "alert": 'rgb(var(--color-alert) / <alpha-value>)',
      },
      fontFamily: {
        primary: 'var(--font-family-primary)',
        secondary: 'var(--font-family-secondary)',
        editor: ['var(--font-family-editor)', ...defaultTheme.fontFamily.sans],
        "editor-heading": ['var(--font-family-editor-heading)', ...defaultTheme.fontFamily.serif],
      },

      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'rgb(var(--color-primary))',
            '--tw-prose-headings': 'rgb(var(--color-primary))',
            '--tw-prose-lead': 'rgb(var(--color-primary))',
            '--tw-prose-links': 'rgb(var(--color-primary))',
            '--tw-prose-bold': 'rgb(var(--color-primary))',
            '--tw-prose-counters': 'rgb(var(--color-secondary))',
            '--tw-prose-bullets': 'rgb(var(--color-secondary))',
            '--tw-prose-hr': 'rgb(var(--color-line-tertiary))',
            '--tw-prose-quotes': 'rgb(var(--color-secondary))',
            '--tw-prose-quote-borders': 'rgb(var(--color-line-tertiary))',
            '--tw-prose-captions': 'rgb(var(--color-secondary))',
            '--tw-prose-code': 'rgb(var(--color-primary))',
            '--tw-prose-pre-code': 'rgb(var(--color-primary))',
            '--tw-prose-pre-bg': 'rgb(var(--color-contrast-primary))',
            '--tw-prose-th-borders': 'rgb(var(--color-line-tertiary))',
            '--tw-prose-td-borders': 'rgb(var(--color-line-tertiary))',
          }
        }
      },

      boxShadow: {
        'menu': ' 0px 4px 6px -2px rgba(0, 0, 9, 0.03), 0px 12px 16px -4px rgba(0, 0, 9, 0.08)',
      }
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/container-queries"),
  ],
}

