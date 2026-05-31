import { describe, it, expect, vi, beforeEach } from 'vitest';
import {RequestManager, TokenManager} from '../../src/request/core.ts';
import HttpRequest from '../../src/request/core.ts';
import type {HttpRequestConfig} from '../../src/request/types.ts';
import { CONSTS } from '../../src/request/constants.ts';
import { localStorage } from '../../src/storage';
import {AxiosHeaders} from "axios";
import type {Storage} from "../../src/storage/types.ts";

// Mock localStorage
vi.mock('../../src/storage', () => ({
  localStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('RequestManager', () => {
  let requestManager: RequestManager;

  beforeEach(() => {
    requestManager = new RequestManager();
  });

  it('should append request to repository', () => {
    const config: HttpRequestConfig = {
      data: undefined,
      headers: new AxiosHeaders({}),
      interceptors: {},
      url: '/api/test', method: 'GET' };
    const controller = requestManager.append(config);
    expect(controller).toBeDefined();
    expect(requestManager.hasKey(config)).toBe(true);
  });

  it('should abort duplicate request', () => {
    const config: HttpRequestConfig = {
      headers: new AxiosHeaders({}),
      interceptors: {},
      url: '/api/test', method: 'GET'
    };
    const controller1 = requestManager.append(config);
    const abortSpy = vi.spyOn(controller1!, 'abort');

    requestManager.append(config);

    expect(abortSpy).toHaveBeenCalled();
  });

  it('should not add noCancel requests to repository', () => {
    const config: HttpRequestConfig = {
      headers: new AxiosHeaders({}),
      interceptors: {},
      url: '/api/test', method: 'GET',
      noCancel: true
    };
    const controller = requestManager.append(config);
    expect(controller).toBeDefined();
    expect(requestManager.hasKey(config)).toBe(false);
  });

  it('should remove request from repository', () => {
    const config: HttpRequestConfig = {
      headers: new AxiosHeaders({}),
      interceptors: {},
      url: '/api/test',
      method: 'GET'
    };
    requestManager.append(config);
    expect(requestManager.hasKey(config)).toBe(true);

    requestManager.remove(config);
    expect(requestManager.hasKey(config)).toBe(false);
  });

  it('should cancel and remove request', () => {
    const config: HttpRequestConfig = {
      headers: new AxiosHeaders({}),
      interceptors: {},
      url: '/api/test',
      method: 'GET'
    };
    const controller = requestManager.append(config);
    const abortSpy = vi.spyOn(controller!, 'abort');

    requestManager.cancelAndRemove(config);

    expect(abortSpy).toHaveBeenCalled();
    expect(requestManager.hasKey(config)).toBe(false);
  });

  it('should clear all requests', () => {
    requestManager.append({
      headers: new AxiosHeaders({}),
      interceptors: {},
      url: '/api/test1',
      method: 'GET'
    });
    requestManager.append({
      headers: new AxiosHeaders({}),
      interceptors: {},
      url: '/api/test2',
      method: 'POST'
    });

    expect(requestManager.getPendingCount()).toBe(2);

    requestManager.clear();

    expect(requestManager.getPendingCount()).toBe(0);
  });
});

describe('HttpRequest', () => {
  let httpRequest: HttpRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    httpRequest = new HttpRequest({} as HttpRequestConfig);
  });

  it('should create instance', () => {
    expect(httpRequest).toBeDefined();
  });

  it('should have basic HTTP methods', () => {
    expect(typeof httpRequest.get).toBe('function');
    expect(typeof httpRequest.post).toBe('function');
    expect(typeof httpRequest.put).toBe('function');
    expect(typeof httpRequest.delete).toBe('function');
    expect(typeof httpRequest.patch).toBe('function');
    expect(typeof httpRequest.upload).toBe('function');
  });

  it('should cancel all requests', () => {
    const clearSpy = vi.spyOn(RequestManager.prototype, 'clear');
    httpRequest.cancelAllRequests('test');
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('should get pending count', () => {
    const count = httpRequest.getPendingCount();
    expect(typeof count).toBe('number');
  });
});

describe('TokenManager', () => {
  let httpRequest: HttpRequest;
  let tokenManager: TokenManager;
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = {
      clear: vi.fn(),
      has:vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    };
    // 使用 vi.resetAllMocks() 而不是 vi.clearAllMocks()，以保留 mock 实现
    vi.resetAllMocks();
    httpRequest = new HttpRequest({storage: mockStorage} as HttpRequestConfig);
    tokenManager = (httpRequest).tokenManager;
  });

  it('should set and get access token', () => {
    const tokenData = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
    };

    tokenManager.setToken(tokenData);

    expect(mockStorage.set).toHaveBeenCalled();

    (mockStorage.get as vi.Mock).mockReturnValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600000,
      refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const accessToken = tokenManager.getAccessToken();
    expect(accessToken).toBe('test-access-token');
  });

  it('should return null when token is expired', () => {
    mockStorage.get.mockReturnValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() - 1000,
      refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const accessToken = tokenManager.getAccessToken();
    expect(accessToken).toBe(null);
  });

  it('should return null when no token data', () => {
    mockStorage.get.mockReturnValue(null);

    const accessToken = tokenManager.getAccessToken();
    expect(accessToken).toBe(null);
  });

  it('should check if token needs refresh', () => {
    // Token expires in 3 minutes (less than 5 minute threshold)
    mockStorage.get.mockReturnValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3 * 60 * 1000,
      refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    expect(tokenManager.needRefresh()).toBe(true);
  });

  it('should clear token', () => {
    tokenManager.clearToken();

    expect(mockStorage.remove).toHaveBeenCalledWith(CONSTS.DEFAULT_TOKEN_DATA_KEY);
  });
});