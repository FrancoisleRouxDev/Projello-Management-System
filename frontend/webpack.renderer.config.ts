// frontend/webpack.renderer.config.ts
import type { Configuration } from 'webpack';
import { DefinePlugin, IgnorePlugin } from 'webpack';
import dotenv from 'dotenv';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

// Load environment variables from .env files
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const env = dotenv.config({ path: envFile }).parsed || {};

// Create DefinePlugin to inject env vars
const definePlugin = new DefinePlugin({
  'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL || ''),
});

// Add CSS support
rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

// Add asset support
rules.push({
  test: /\.mp3$/,
  use: [{ 
    loader: 'file-loader',
    options: { esModule: false }
  }],
});

rules.push({
  test: /\.svg$/,
  use: [{ 
    loader: 'file-loader',
    options: { esModule: false }
  }],
});

// === STRONG TEST EXCLUSION ===
rules.push({
  test: /\.(test|spec)\.tsx?$/,
  loader: 'ignore-loader',   // ignores the file completely during build
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [
    ...plugins, 
    definePlugin,
    // Extra safety layers
    new IgnorePlugin({
      resourceRegExp: /\.(test|spec)\.(ts|tsx)$/,
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};