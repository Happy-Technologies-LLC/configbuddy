// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

// Patch Node.js v22+ broken experimental localStorage before anything else.
// Node provides a localStorage/sessionStorage global without Storage API methods.
const _patchStorage = (name: 'localStorage' | 'sessionStorage') => {
  const existing = globalThis[name];
  if (existing && typeof existing.clear !== 'function') {
    const store: Record<string, string> = {};
    const mock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] ?? null,
    };
    try {
      Object.defineProperty(globalThis, name, { value: mock, writable: true, configurable: true });
    } catch {
      Object.assign(existing, mock);
    }
  }
};
_patchStorage('localStorage');
_patchStorage('sessionStorage');

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  try { localStorage.clear(); } catch { /* Node.js compat */ }
  try { sessionStorage.clear(); } catch { /* Node.js compat */ }
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;
