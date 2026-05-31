import { describe, it, expect } from 'vitest';
import {
  matchPattern,
  isWithoutToken,
  isNoCancel,
  getSpecialConfig,
  shouldCancelRequest,
  getRepositoryKey,
  isDuplicateRequest,
  getMethodPriority,
  mergeConfig,
  generateRequestId,
  generateTraceId,
  getOrGenerateTraceId,
  generateTracingInfo,
  addTracingHeaders,
} from '../../src/request/utils.ts';
import type {HttpRequestConfig} from '../../src/request/types.ts';
import { CONSTS } from '../../src/request/constants.ts';
import {AxiosHeaders} from "axios";

describe('utils', () => {
  describe('matchPattern', () => {
    it('should match exact pattern', () => {
      expect(matchPattern('/api/test', ['/api/test'])).toBe(true);
    });

    it('should match wildcard prefix', () => {
      expect(matchPattern('/api/users/123', ['*/users/*'])).toBe(true);
    });

    it('should match wildcard suffix', () => {
      expect(matchPattern('/api/users/list', ['/api/users/*'])).toBe(true);
    });

    it('should match wildcard contains', () => {
      expect(matchPattern('/api/v1/users', ['*v1*'])).toBe(true);
    });

    it('should return false for non-matching pattern', () => {
      expect(matchPattern('/api/test', ['/api/other'])).toBe(false);
    });

    it('should return false for undefined url', () => {
      expect(matchPattern(undefined, ['/api/test'])).toBe(false);
    });
  });

  describe('isWithoutToken', () => {
    it('should return true if url is in whitelist', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/auth/login',
        whiteList: { withToken: ['/api/auth/login', '/api/auth/register'] },
      };
      expect(isWithoutToken(config)).toBe(true);
    });

    it('should return false if url is not in whitelist', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/users',
        whiteList: { withToken: ['/api/auth/login'] },
      };
      expect(isWithoutToken(config)).toBe(false);
    });

    it('should return false if whitelist is undefined', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test'
      };
      expect(isWithoutToken(config)).toBe(false);
    });
  });

  describe('isNoCancel', () => {
    it('should return true if noCancel is explicitly set to true', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test',
        noCancel: true
      };
      expect(isNoCancel(config)).toBe(true);
    });

    it('should return false if noCancel is explicitly set to false', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test',
        noCancel: false
      };
      expect(isNoCancel(config)).toBe(false);
    });

    it('should return true if url is in noCancel whitelist', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/upload',
        whiteList: { noCancel: ['/api/upload', '/api/large-file'] },
      };
      expect(isNoCancel(config)).toBe(true);
    });
  });

  describe('getSpecialConfig', () => {
    it('should return special config if url matches pattern', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/special',
        whiteList: {
          special: { '/api/special': { timeout: 60000 } },
        },
      };
      expect(getSpecialConfig(config)).toEqual({ timeout: 60000 });
    });

    it('should return undefined if no matching pattern', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test',
        whiteList: {
          special: { '/api/special': { timeout: 60000 } },
        },
      };
      expect(getSpecialConfig(config)).toBeUndefined();
    });
  });

  describe('shouldCancelRequest', () => {
    it('should return false if in noCancel whitelist', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/upload',
        whiteList: { noCancel: ['/api/upload'] },
      };
      expect(shouldCancelRequest(config)).toBe(false);
    });

    it('should return false if cancelConfig.enabled is false', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test',
        cancelConfig: { enabled: false },
      };
      expect(shouldCancelRequest(config)).toBe(false);
    });

    it('should return false if method is disabled in cancelConfig', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test',
        method: 'GET',
        cancelConfig: { methods: { GET: false } },
      };
      expect(shouldCancelRequest(config)).toBe(false);
    });

    it('should return true by default', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test'
      };
      expect(shouldCancelRequest(config)).toBe(true);
    });
  });

  describe('getRepositoryKey', () => {
    it('should generate unique key for non-cancel requests', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test',
        noCancel: true,
      };
      const key = getRepositoryKey(config);
      expect(key).toMatch(/^non_cancel_\d+_.+/);
    });

    it('should generate consistent key for same requests', () => {
      const config1: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        method: 'GET',
        url: '/api/users',
        params: { page: 1, size: 10 },
      };
      const config2: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        method: 'GET',
        url: '/api/users',
        params: { page: 1, size: 10 },
      };
      expect(getRepositoryKey(config1)).toBe(getRepositoryKey(config2));
    });

    it('should exclude timestamp and __noCache from params', () => {
      const config1: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        method: 'GET',
        url: '/api/users',
        params: { page: 1, timestamp: 1234567890, __noCache: true },
      };
      const config2: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        method: 'GET',
        url: '/api/users',
        params: { page: 1 },
      };
      expect(getRepositoryKey(config1)).toBe(getRepositoryKey(config2));
    });
  });

  describe('isDuplicateRequest', () => {
    it('should return true for duplicate requests', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        method: 'GET',
        url: '/api/users',
        params: { page: 1 },
      };
      const keys = new Set([getRepositoryKey(config)]);
      expect(isDuplicateRequest(config, keys)).toBe(true);
    });

    it('should return false for non-duplicate requests', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        method: 'GET',
        url: '/api/users',
        params: { page: 1 },
      };
      const keys = new Set(['GET&/api/other&{}&{}']);
      expect(isDuplicateRequest(config, keys)).toBe(false);
    });

    it('should return false for non-cancel requests', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/test',
        noCancel: true,
      };
      const keys = new Set();
      expect(isDuplicateRequest(config, keys)).toBe(false);
    });
  });

  describe('getMethodPriority', () => {
    it('should return correct priority for each method', () => {
      expect(getMethodPriority('GET')).toBe(1);
      expect(getMethodPriority('POST')).toBe(2);
      expect(getMethodPriority('PUT')).toBe(3);
      expect(getMethodPriority('PATCH')).toBe(4);
      expect(getMethodPriority('DELETE')).toBe(5);
    });

    it('should return default priority for unknown method', () => {
      expect(getMethodPriority('UNKNOWN')).toBe(10);
    });
  });

  describe('mergeConfig', () => {
    it('should merge default config with request config', () => {
      const defaultConfig: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        timeout: 30000,
        baseURL: 'https://default.com'
      };
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        timeout: 60000,
        url: '/api/test'
      };
      const merged = mergeConfig(defaultConfig, config);
      expect(merged.timeout).toBe(60000);
      expect(merged.baseURL).toBe('https://default.com');
      expect(merged.url).toBe('/api/test');
    });

    it('should apply special config when url matches', () => {
      const defaultConfig: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        timeout: 30000
      };
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        url: '/api/special',
        whiteList: { special: { '/api/special': { timeout: 120000 } } },
      };
      const merged = mergeConfig(defaultConfig, config);
      expect(merged.timeout).toBe(120000);
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request id', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  describe('generateTraceId', () => {
    it('should generate uuid-like trace id', () => {
      const traceId = generateTraceId();
      // 标准 UUID v4 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(traceId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[4][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    });
  });

  describe('getOrGenerateTraceId', () => {
    it('should return existing traceId from headers', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({
          [CONSTS.DEFAULT_X_Trace_ID]: 'existing-trace-id'
        }),
        interceptors: {},
      };
      expect(getOrGenerateTraceId(config)).toBe('existing-trace-id');
    });

    it('should generate new traceId if not in headers', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
      };
      const traceId = getOrGenerateTraceId(config);
      expect(traceId).toBeDefined();
    });
  });

  describe('generateTracingInfo', () => {
    it('should return empty ids when tracing is disabled', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        tracing: { enabled: false }
      };
      const info = generateTracingInfo(config);
      expect(info.requestId).toBe('');
      expect(info.traceId).toBe('');
    });

    it('should generate tracing info when enabled', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        tracing: { enabled: true }
      };
      const info = generateTracingInfo(config);
      expect(info.requestId).toBeDefined();
      expect(info.traceId).toBeDefined();
    });
  });

  describe('addTracingHeaders', () => {
    it('should add tracing headers to config', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        tracing: { enabled: true }
      };
      const result = addTracingHeaders(config);
      expect(result.headers?.get(CONSTS.DEFAULT_X_REQUEST_ID)).toBeDefined();
      expect(result.headers?.get(CONSTS.DEFAULT_X_Trace_ID)).toBeDefined();
    });

    it('should not add headers when tracing is disabled', () => {
      const config: HttpRequestConfig = {
        headers: new AxiosHeaders({}),
        interceptors: {},
        tracing: { enabled: false }
      };
      const result = addTracingHeaders(config);
      expect(result).toBe(config);
    });
  });
});