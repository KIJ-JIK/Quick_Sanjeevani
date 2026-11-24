/**
 * React Native Isomorphic Shim
 * Provides fallback UI primitives for test environments where React Native native binaries are not compiled.
 */

let realRN = null;
try {
  realRN = require('react-native');
} catch (e) {
  // Use fallback shim
}

if (realRN && realRN.View) {
  module.exports = realRN;
} else {
  const React = require('./react-shim');

  function createComponent(name) {
    const Comp = (props) => {
      const children = props && props.children;
      return React.createElement(name, props, children);
    };
    Comp.displayName = name;
    return Comp;
  }

  const StyleSheet = {
    create: (styles) => styles,
    flatten: (style) => {
      if (!style) return {};
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.filter(Boolean));
      }
      return style;
    }
  };

  const Platform = {
    OS: 'android',
    select: (obj) => obj.android || obj.default
  };

  const Alert = {
    alert: (title, message, buttons) => {
      // In tests/headless, this is a non-blocking no-op
      if (buttons && buttons.length > 0 && typeof buttons[0].onPress === 'function') {
        buttons[0].onPress();
      }
    }
  };

  module.exports = {
    View: createComponent('View'),
    Text: createComponent('Text'),
    TouchableOpacity: createComponent('TouchableOpacity'),
    TouchableHighlight: createComponent('TouchableHighlight'),
    TextInput: createComponent('TextInput'),
    ScrollView: createComponent('ScrollView'),
    SafeAreaView: createComponent('SafeAreaView'),
    ActivityIndicator: createComponent('ActivityIndicator'),
    FlatList: createComponent('FlatList'),
    StyleSheet,
    Platform,
    Alert
  };
}
