const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

// The liturgy screen loads the supplied diary data as a bundled CSV asset.
config.resolver.assetExts.push('csv');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'firebase/auth' && platform !== 'web') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/firebase/node_modules/@firebase/auth/dist/rn/index.js'),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
