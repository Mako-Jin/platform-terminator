import { useState, useEffect, useCallback, useRef } from 'react';

// 请求函数类型
interface RequestFn<T, P extends unknown[] = unknown[]> {
    (...args: P): Promise<T>;
}

interface UseRequestOptions<T, P extends unknown[] = unknown[]> {
    manual?: boolean;           // 是否手动触发
    debounce?: number;          // 防抖延迟（ms）
    debounceImmediate?: boolean; // 防抖是否立即执行
    onSuccess?: (data: T) => void;
    onError?: (error: unknown) => void;
    defaultParams?: P;          // 默认参数
}

interface UseRequestResult<T, P extends unknown[] = unknown[]> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    run: (...args: P) => Promise<T>;
    cancel: () => void;
    refresh: () => void;
    mutate: (data: T) => void;
}

// TODO 路由切换时取消所有请求
export function useRequest<T, P extends unknown[] = unknown[]>(
    requestFn: RequestFn<T, P>,
    options: UseRequestOptions<T, P> = {}
): UseRequestResult<T, P> {
    const {
        manual = false,
        debounce = 0,
        debounceImmediate = false,
        onSuccess,
        onError,
        defaultParams = [] as unknown as P,
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(!manual);
    const [error, setError] = useState<Error | null>(null);

    const isMountedRef = useRef(true);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isCanceledRef = useRef(false);

    // 取消请求（标记为已取消，依赖 core.ts 的取消机制）
    const cancel = useCallback(() => {
        isCanceledRef.current = true;
    }, []);

    const executeRequest = useCallback(async (args: P): Promise<T> => {
        if (!isMountedRef.current) {
            return new Promise(() => {});
        }

        setLoading(true);
        setError(null);

        try {
            // 直接调用请求函数，取消机制由 core.ts 处理
            const result = await requestFn(...args);

            if (isMountedRef.current && !isCanceledRef.current) {
                setData(result);
                onSuccess?.(result);
            }
            return result;
        } catch (err: unknown) {
            // 忽略取消的错误（core.ts 会抛出 isCanceled 标志）
            const isCanceled = (err as Record<string, unknown>)?.isCanceled === true;
            if (isCanceled) {
                return Promise.reject(err);
            }
            if (isMountedRef.current && !isCanceledRef.current) {
                setError(err instanceof Error ? err : new Error(String(err)));
                onError?.(err);
            }
            return Promise.reject(err);
        } finally {
            if (isMountedRef.current && !isCanceledRef.current) {
                setLoading(false);
            }
        }
    }, [onError, onSuccess, requestFn]);

    // 执行请求
    const run = useCallback(async (...args: P): Promise<T> => {
        // 重置取消标记
        isCanceledRef.current = false;

        // 防抖处理
        if (debounce > 0) {
            return new Promise((resolve, reject) => {
                if (timerRef.current) clearTimeout(timerRef.current);

                const execute = () => {
                    if (isCanceledRef.current) {
                        return reject(new Error('请求已取消'));
                    }
                    if (!isMountedRef.current) {
                        return reject(new Error('组件已卸载'));
                    }
                    executeRequest(args).then(resolve).catch(reject);
                };

                if (debounceImmediate && !timerRef.current) {
                    // 立即执行
                    execute();
                }

                timerRef.current = setTimeout(execute, debounce);
            });
        }

        return executeRequest(args);
    }, [debounce, debounceImmediate, executeRequest]);

    const refresh = useCallback(() => {
        run(...defaultParams);
    }, [run, defaultParams]);

    const mutate = useCallback((newData: T) => {
        setData(newData);
    }, []);

    useEffect(() => {
        if (!manual) {
            run(...defaultParams).catch(() => {});
        }

        return () => {
            isMountedRef.current = false;
            cancel();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [manual, run, defaultParams, cancel]);

    return { data, loading, error, run, cancel, refresh, mutate };
}