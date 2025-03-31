const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add path alias resolution
config.resolver.alias = {
  '@': __dirname,
};

// Handle native-only modules on web platform
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const nativeModules = [
      'react-native-maps',
      'MapMarkerNativeComponent',
      'codegenNativeCommands',
      'react-native/Libraries/Utilities/codegenNativeCommands',
      'react-native-maps/lib/MapMarkerNativeComponent',
      'react-native-maps/lib/commonjs/MapMarkerNativeComponent',
      'react-native-maps/lib/module/MapMarkerNativeComponent'
    ];

    if (nativeModules.some(module => moduleName.includes(module))) {
      return {
        type: 'empty',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;