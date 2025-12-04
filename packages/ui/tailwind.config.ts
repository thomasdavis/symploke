export default {
  presets: [],

  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        border: 'var(--color-border)',
      },
      fontFamily: {
        sora: 'var(--font-sora)',
        sen: 'var(--font-sen)',
        'azeret-mono': 'var(--font-azeret-mono)',
      },
    },
  },

  plugins: [],
}
