import type { Configuration } from 'webpack';
import { DefinePlugin } from 'webpack';
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

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.mp3$/,
  use: [{ 
    loader: 'file-loader',
    options: {
      esModule: false,
    }
  }],
});

rules.push({
  test: /\.svg$/,
  use: [{ 
    loader: 'file-loader',
    options: {
      esModule: false,
    }
  }],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [...plugins, definePlugin],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};