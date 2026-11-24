import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#070B14',
          surface: '#0F172A',
          elevated: '#162033',
          card: '#1B2740',
          emerald: '#10B981',
          amber: '#F59E0B',
          blue: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        emeraldGlow: '0 0 28px -4px rgba(16, 185, 129, 0.38)',
        amberGlow: '0 0 28px -4px rgba(245, 158, 11, 0.35)',
        blueGlow: '0 0 28px -4px rgba(59, 130, 246, 0.38)',
      },
    },
  },
  plugins: [],
};

export default config;
