import type { Config } from 'tailwindcss';

/**
 * Robotek brand palette only. `colors` is replaced (not extended), so Tailwind's
 * default greens, blues etc. do not exist in this project.
 * Tints are the brand colour mixed with White #FEFEFE.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FEFEFE',
      red: { DEFAULT: '#E52D31', 20: '#F9D4D5', 10: '#FCE9EA' },
      maroon: { DEFAULT: '#852321', 20: '#E6D2D2', 10: '#F2E8E8' },
      ink: {
        DEFAULT: '#1F1B20',
        80: '#4C484C',
        60: '#787679',
        40: '#A5A3A5',
        20: '#D1D1D2',
        10: '#E8E7E8',
        5: '#F3F3F3',
      },
      yellow: { DEFAULT: '#F7DA11', 40: '#FBF09F', 20: '#FDF7CF' },
    },
    fontFamily: {
      sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    extend: {},
  },
  plugins: [],
};

export default config;
