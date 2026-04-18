/**
 * Vitest Test Setup
 *
 * This file is executed before each test file.
 * It sets up globalThis test utilities and mocks.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Cleanup after each test to prevent state leakage
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (used by many UI components)
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock ResizeObserver (used by charts and 3D components)
beforeAll(() => {
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Mock IntersectionObserver (used for lazy loading)
beforeAll(() => {
  globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
    takeRecords: vi.fn().mockReturnValue([]),
  }));
});

// Mock requestAnimationFrame (used by animations and Three.js)
beforeAll(() => {
  globalThis.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(callback, 16) as unknown as number;
  });
  globalThis.cancelAnimationFrame = vi.fn((id) => {
    clearTimeout(id);
  });
});

// Mock WebGL context (used by Three.js/React Three Fiber)
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === 'webgl' || contextId === 'webgl2') {
      return {
        canvas: document.createElement('canvas'),
        getExtension: vi.fn(),
        getParameter: vi.fn().mockReturnValue(16),
        getShaderPrecisionFormat: vi.fn().mockReturnValue({
          precision: 23,
          rangeMin: 127,
          rangeMax: 127,
        }),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn().mockReturnValue(true),
        getShaderParameter: vi.fn().mockReturnValue(true),
        useProgram: vi.fn(),
        getAttribLocation: vi.fn().mockReturnValue(0),
        getUniformLocation: vi.fn().mockReturnValue({}),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniformMatrix4fv: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        viewport: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        blendFunc: vi.fn(),
        depthFunc: vi.fn(),
        cullFace: vi.fn(),
        frontFace: vi.fn(),
        createTexture: vi.fn(),
        bindTexture: vi.fn(),
        texImage2D: vi.fn(),
        texParameteri: vi.fn(),
        generateMipmap: vi.fn(),
        activeTexture: vi.fn(),
        pixelStorei: vi.fn(),
        createFramebuffer: vi.fn(),
        bindFramebuffer: vi.fn(),
        framebufferTexture2D: vi.fn(),
        checkFramebufferStatus: vi.fn().mockReturnValue(36053), // FRAMEBUFFER_COMPLETE
        deleteTexture: vi.fn(),
        deleteFramebuffer: vi.fn(),
        deleteBuffer: vi.fn(),
        deleteProgram: vi.fn(),
        deleteShader: vi.fn(),
        scissor: vi.fn(),
        colorMask: vi.fn(),
        depthMask: vi.fn(),
        stencilMask: vi.fn(),
        stencilFunc: vi.fn(),
        stencilOp: vi.fn(),
        lineWidth: vi.fn(),
        polygonOffset: vi.fn(),
        readPixels: vi.fn(),
        getError: vi.fn().mockReturnValue(0),
        isContextLost: vi.fn().mockReturnValue(false),
      };
    }
    return null;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

// Suppress console errors/warnings during tests (optional, remove if you need to debug)
// beforeAll(() => {
//   vi.spyOn(console, 'error').mockImplementation(() => {});
//   vi.spyOn(console, 'warn').mockImplementation(() => {});
// });
