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

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/index.ts',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    ...plugins, 
    definePlugin,
    new IgnorePlugin({
      resourceRegExp: /\.(test|spec)\.(ts|tsx)$/,
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};