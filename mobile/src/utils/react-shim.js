/**
 * React Isomorphic Shim
 * Provides fallback React primitives for test environments where React Native native binaries are not compiled.
 */

let realReact = null;
try {
  realReact = require('react');
} catch (e) {
  // Use fallback shim
}

if (realReact && realReact.Component) {
  module.exports = realReact;
} else {
  class Component {
    constructor(props = {}) {
      this.props = props;
      this.state = {};
    }

    setState(partialState, callback) {
      if (typeof partialState === 'function') {
        this.state = { ...this.state, ...partialState(this.state, this.props) };
      } else {
        this.state = { ...this.state, ...partialState };
      }
      if (callback) callback();
    }

    render() {
      return null;
    }
  }

  function createElement(type, props, ...children) {
    const flatChildren = children.flat ? children.flat() : children;
    return {
      type,
      props: {
        ...(props || {}),
        children: flatChildren.length === 1 ? flatChildren[0] : (flatChildren.length === 0 ? undefined : flatChildren)
      }
    };
  }

  function useState(initial) {
    let val = typeof initial === 'function' ? initial() : initial;
    const setter = (newVal) => {
      val = typeof newVal === 'function' ? newVal(val) : newVal;
    };
    return [val, setter];
  }

  function useEffect(fn, deps) {
    if (typeof fn === 'function') {
      try {
        fn();
      } catch (e) {
        // Ignored in test environment
      }
    }
  }

  function useCallback(fn, deps) {
    return fn;
  }

  function useMemo(fn, deps) {
    return typeof fn === 'function' ? fn() : fn;
  }

  function useRef(initial) {
    return { current: initial };
  }

  module.exports = {
    Component,
    createElement,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    Fragment: 'Fragment'
  };
}
