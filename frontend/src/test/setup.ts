import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for react-use-measure (used by @react-three/fiber Canvas)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock WebGL context for Three.js tests
const origGetContext = HTMLCanvasElement.prototype.getContext;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(HTMLCanvasElement.prototype as any).getContext = function (
  type: string,
  ...args: unknown[]
) {
  if (type === 'webgl' || type === 'webgl2') {
    return {
      canvas: this,
      getExtension: () => null,
      getParameter: () => 0,
      createShader: () => ({}),
      shaderSource: () => undefined,
      compileShader: () => undefined,
      getShaderParameter: () => true,
      createProgram: () => ({}),
      attachShader: () => undefined,
      linkProgram: () => undefined,
      getProgramParameter: () => true,
      createBuffer: () => ({}),
      bindBuffer: () => undefined,
      bufferData: () => undefined,
      enable: () => undefined,
      disable: () => undefined,
      viewport: () => undefined,
      clearColor: () => undefined,
      clear: () => undefined,
      useProgram: () => undefined,
      createTexture: () => ({}),
      bindTexture: () => undefined,
      texParameteri: () => undefined,
      texImage2D: () => undefined,
      drawArrays: () => undefined,
      drawElements: () => undefined,
      getAttribLocation: () => 0,
      getUniformLocation: () => ({}),
      uniform1f: () => undefined,
      uniform2f: () => undefined,
      uniform3f: () => undefined,
      uniform4f: () => undefined,
      uniformMatrix4fv: () => undefined,
      enableVertexAttribArray: () => undefined,
      vertexAttribPointer: () => undefined,
      activeTexture: () => undefined,
      uniform1i: () => undefined,
      createFramebuffer: () => ({}),
      bindFramebuffer: () => undefined,
      framebufferTexture2D: () => undefined,
      createRenderbuffer: () => ({}),
      bindRenderbuffer: () => undefined,
      renderbufferStorage: () => undefined,
      framebufferRenderbuffer: () => undefined,
      checkFramebufferStatus: () => 36053,
      scissor: () => undefined,
      blendFunc: () => undefined,
      blendEquation: () => undefined,
      depthFunc: () => undefined,
      depthMask: () => undefined,
      colorMask: () => undefined,
      stencilFunc: () => undefined,
      stencilOp: () => undefined,
      stencilMask: () => undefined,
      generateMipmap: () => undefined,
      pixelStorei: () => undefined,
      deleteTexture: () => undefined,
      deleteBuffer: () => undefined,
      deleteFramebuffer: () => undefined,
      deleteRenderbuffer: () => undefined,
      deleteProgram: () => undefined,
      deleteShader: () => undefined,
      getShaderInfoLog: () => '',
      getProgramInfoLog: () => '',
      isContextLost: () => false,
    };
  }
  return origGetContext.call(this, type, ...args);
};
