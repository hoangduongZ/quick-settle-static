window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        felt: '#12372A',
        felt2: '#0B241C',
        card: '#FFF9EC',
        ink: '#1A1815',
        brass: '#C9973A',
        clay: '#B7552F',
        mint: '#69D7A5'
      },
      boxShadow: {
        card: '0 18px 55px rgba(7, 20, 15, .18)',
        insetRail: 'inset 0 0 0 1px rgba(255,255,255,.12)'
      }
    }
  }
};
