import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRequest } from '../../src/request/hooks.ts';
import { act, renderHook } from '@testing-library/react';

describe('useRequest', () => {
  const mockRequestFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestFn.mockResolvedValue('success');
  });

  it('should initialize with loading state when manual is false', async () => {
    const { result } = renderHook(() => useRequest(mockRequestFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should not call request immediately when manual is true', () => {
    renderHook(() => useRequest(mockRequestFn, { manual: true }));

    expect(mockRequestFn).not.toHaveBeenCalled();
  });

  it('should call request immediately when manual is false', async () => {
    renderHook(() => useRequest(mockRequestFn));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockRequestFn).toHaveBeenCalled();
  });

  it('should return data on success', async () => {
    const { result } = renderHook(() => useRequest(mockRequestFn));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('success');
    expect(result.current.error).toBe(null);
  });

  it('should set error on failure', async () => {
    const error = new Error('test error');
    mockRequestFn.mockRejectedValue(error);

    const { result } = renderHook(() => useRequest(mockRequestFn));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(error);
  });

  it('should call onSuccess callback', async () => {
    const onSuccessSpy = vi.fn();

    renderHook(() => useRequest(mockRequestFn, { onSuccess: onSuccessSpy }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onSuccessSpy).toHaveBeenCalledWith('success');
  });

  it('should call onError callback', async () => {
    const onErrorSpy = vi.fn();
    const error = new Error('test error');
    mockRequestFn.mockRejectedValue(error);

    renderHook(() => useRequest(mockRequestFn, { onError: onErrorSpy }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(onErrorSpy).toHaveBeenCalledWith(error);
  });

  it('should run request with params', async () => {
    const { result } = renderHook(() => useRequest(mockRequestFn, { manual: true }));

    await act(async () => {
      await result.current.run('param1', 'param2');
    });

    expect(mockRequestFn).toHaveBeenCalledWith('param1', 'param2');
  });

  it('should refresh with default params', async () => {
    const { result } = renderHook(() => useRequest(mockRequestFn, {
      manual: true,
      defaultParams: ['default-param']
    }));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockRequestFn).toHaveBeenCalledWith('default-param');
  });

  it('should mutate data', () => {
    const { result } = renderHook(() => useRequest(mockRequestFn, { manual: true }));

    act(() => {
      result.current.mutate('mutated-data');
    });

    expect(result.current.data).toBe('mutated-data');
  });

  it('should cancel request', async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((res) => {
      resolve = res;
    });
    mockRequestFn.mockReturnValue(promise);

    const { result } = renderHook(() => useRequest(mockRequestFn));

    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      resolve('success');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Data should not be updated after cancel
    expect(result.current.data).toBe(null);
  });

  it('should debounce requests', async () => {
    const { result } = renderHook(() => useRequest(mockRequestFn, {
      manual: true,
      debounce: 100
    }));

    act(() => {
      result.current.run('first');
      result.current.run('second');
      result.current.run('third');
    });

    // Should not have been called yet due to debounce
    expect(mockRequestFn).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    // Should only be called once with the last params
    expect(mockRequestFn).toHaveBeenCalledTimes(1);
    expect(mockRequestFn).toHaveBeenCalledWith('third');
  });

  it('should execute immediately when debounceImmediate is true', async () => {
    const { result } = renderHook(() => useRequest(mockRequestFn, {
      manual: true,
      debounce: 100,
      debounceImmediate: true
    }));

    act(() => {
      result.current.run('first');
    });

    // Should be called immediately
    expect(mockRequestFn).toHaveBeenCalledTimes(1);
    expect(mockRequestFn).toHaveBeenCalledWith('first');
  });
});
