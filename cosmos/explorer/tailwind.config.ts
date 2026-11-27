import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', md: '900px', lg: '1200px', xl: '1536px', '2xl': '1920px' },
    extend: {
      colors: {
        base: 'var(--bg-base)',
        panel: { DEFAULT: 'var(--bg-panel)', 2: 'var(--bg-panel-2)' },
        elevated: 'var(--bg-elevated)',
        border: { subtle: 'var(--border-subtle)', strong: 'var(--border-strong)' },
        ink: {
          DEFAULT: 'var(--text-primary)',
          subtle: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          dim: 'var(--accent-primary-dim)',
          model: 'var(--accent-model)',
          warn: 'var(--accent-uncertainty)',
          danger: 'var(--accent-danger)',
          success: 'var(--accent-success)',
        },
      },
      spacing: {
        navrail: 'var(--navrail-w)',
        panel: 'var(--panel-w)',
        info: 'var(--info-w)',
        timebar: 'var(--timebar-h)',
        statusbar: 'var(--statusbar-h)',
        topbar: 'var(--topbar-h)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        ui: 'var(--font-ui)',
        mono: 'var(--font-mono)',
      },
      fontVariantNumeric: { tabular: 'tabular-nums' },
    },
  },
  plugins: [],
} satisfies Config;
