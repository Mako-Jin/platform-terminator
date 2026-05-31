import axios, {
    AxiosError,
    AxiosHeaders,
    type AxiosInstance,
    type AxiosRequestHeaders,
    type AxiosResponse
} from "axios";
import {LoggerFactory} from "../utils";
import {
    type HttpRequestConfig, HttpStatus,
    type RefreshTokenResponse,
    RequestMethodEnum,
    type Result,
    type TokenData,
} from "./types.ts";
import {localStorage} from "../storage";
import {CONSTS} from "./constants.ts";
import {addTracingHeaders, getRepositoryKey, isNoCancel, mergeConfig} from "./utils.ts";


// 定义等待请求的类型
interface PendingRequest<T = unknown> {
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
    config: HttpRequestConfig;
}


export class TokenManager {

    private config: HttpRequestConfig;

    private readonly httpRequest?: HttpRequest;

    private refreshingPromise: Promise<string> | null = null;

    private pendingRequests: PendingRequest[] = [];

    private isRefreshing = false;

    constructor(httpRequest: HttpRequest, config: HttpRequestConfig) {
        this.httpRequest = httpRequest;
        this.config = {
            tokenConfig: {
                enabled: true,
                refreshUrl: '/api/refreshToken',
                expiresThreshold: 5 * 60 * 1000,
                refreshExpiresIn: 7 * 24 * 60 * 60 * 1000,
                ...config.tokenConfig,
            },
            ...config,
        };
    }

    private isTokenData(data: unknown): data is TokenData {
        if (typeof data !== 'object' || data === null) {
            return false;
        }
        const token = data as Record<string, unknown>;
        return (
            typeof token.accessToken === 'string' &&
            typeof token.refreshToken === 'string' &&
            typeof token.expiresAt === 'number' &&
            typeof token.refreshExpiresAt === 'number'
        );
    }

    // 检查是否正在刷新
    getIsRefreshing(): boolean {
        return this.isRefreshing;
    }

    // 使用配置的存储实现
    private get storage() {
        return this.config.storage || localStorage;
    }

    private getTokenData(): TokenData | null {
        const data = this.storage.get(this.tokenDataKey);
        if (!data || !this.isTokenData(data)) {
            return null;
        }
        return data as TokenData;
    }

    private get tokenDataKey() {
        return this.config.tokenConfig?.storageKeys?.tokenDataKey || CONSTS.DEFAULT_TOKEN_DATA_KEY;
    }

    // 存储token
    setToken(data: { accessToken: string; refreshToken: string; expiresIn: number }) {
        const now = Date.now();
        const tokenData: TokenData = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: now + data.expiresIn * 1000,
            refreshExpiresAt: now + (this.config.tokenConfig?.refreshExpiresIn || CONSTS.DEFAULT_REFRESH_EXPIRES_AT),
        };
        this.storage.set(this.tokenDataKey, tokenData);
    }

    // 获取accessToken
    getAccessToken(): string | null {
        const tokenData = this.getTokenData();
        if (!tokenData) {
            return null;
        }

        // 检查是否过期
        if (Date.now() >= tokenData.expiresAt) {
            return null;
        }
        return tokenData.accessToken;
    }

    // 获取refreshToken
    getRefreshToken(): string | null {
        const tokenData = this.getTokenData();
        if (!tokenData) {
            return null;
        }

        // 检查refreshToken是否过期
        if (Date.now() >= tokenData.refreshExpiresAt) {
            this.clearToken();
            return null;
        }
        return tokenData.refreshToken;
    }

    // 检查token是否需要刷新（还剩5分钟内过期）
    needRefresh(): boolean {
        const tokenData = this.getTokenData();
        if (!tokenData) {
            return true;
        }

        const timeToExpire = tokenData.expiresAt - Date.now();
        const threshold = this.config.tokenConfig?.expiresThreshold;
        return timeToExpire < threshold!;
    }

    // 清空token
    clearToken() {
        this.storage.remove(this.tokenDataKey);
        this.storage.remove(this.config.tokenConfig?.storageKeys?.accessTokenKey || CONSTS.DEFAULT_ACCESS_TOKEN_KEY);
    }

    // 刷新token
    async refreshToken(): Promise<string> {
        if (!this.httpRequest) {
            throw new Error('HttpRequest instance not set');
        }

        if (!this.config.tokenConfig?.enabled) {
            throw new Error('Token refresh is disabled');
        }

        // 如果已经在刷新中，返回同一个Promise
        if (this.isRefreshing && this.refreshingPromise) {
            return this.refreshingPromise;
        }

        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            this.clearToken();
            throw new Error('Refresh token not found');
        }

        this.isRefreshing = true;
        this.refreshingPromise = this.executeRefreshToken();

        return this.refreshingPromise;
    }

    /**
     * 执行 token 刷新逻辑
     */
    private async executeRefreshToken(): Promise<string> {
        try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
                this.clearToken();
                throw new Error('Refresh token not found');
            }

            // 调用刷新接口
            const response = await this.httpRequest!.post<AxiosResponse<Result<RefreshTokenResponse>>>({
                url: this.config.tokenConfig?.refreshUrl,
                data: { refreshToken },
                skipRefresh: true,
                withToken: false,
                headers: new AxiosHeaders({}),
            });

            // 支持单个字符串或数组
            const successCode = this.config.successCode || CONSTS.DEFAULT_RESPONSE_CODE_SUCCESS;
            const successCodes = Array.isArray(successCode) ? successCode : [successCode];

            if (successCodes.includes(response.data.code)) {
                const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.data;
                this.setToken({
                    accessToken,
                    refreshToken: newRefreshToken,
                    expiresIn
                });

                await this.retryPendingRequests();
                return accessToken;
            } else {
                this.clearToken();
                throw new Error('Refresh token failed');
            }
        } finally {
            this.isRefreshing = false;
            this.refreshingPromise = null;
        }
    }

    private async retryPendingRequests() {
        const pending = [...this.pendingRequests];
        this.pendingRequests = [];

        for (const { config, resolve, reject } of pending) {
            try {
                const result = await this.retryRequest(config);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }

    // 重试请求
    async retryRequest(config: HttpRequestConfig) {
        const newConfig = { ...config };
        const newToken = this.getAccessToken();
        const headers = new AxiosHeaders(newConfig.headers);

        if (newToken) {
            headers.set(CONSTS.DEFAULT_AUTHENTICATION_HEADER, `${CONSTS.DEFAULT_AUTHENTICATION_HEADER_VALUE_PREFIX} ${newToken}`);
            newConfig.headers = headers;
        }
        return this.httpRequest!.request(newConfig);
    }

    // 添加等待队列
    addPendingRequest(handler: PendingRequest) {
        this.pendingRequests.push(handler);
    }
}


export class RequestManager {

    private logger = LoggerFactory.create('common-tools-request-manager');

    // 用于存储每个请求的标识和取消函数
    private requestRepository = new Map<string, AbortController>();

    /**
     * 添加请求
     * @param config 请求配置
     */
    public append(config: HttpRequestConfig): AbortController | null {
        const controller = new AbortController();
        config.signal = config.signal || controller.signal;

        // 白名单接口不添加到取消队列
        if (isNoCancel(config)) {
            return controller;
        }

        const key = getRepositoryKey(config);

        // 如果已有相同 key 的请求，先取消旧的
        const existingController = this.requestRepository.get(key);
        if (existingController) {
            existingController.abort();
            this.logger.info(`取消重复请求: ${key}`);
        }

        this.requestRepository.set(key, controller);
        return controller;
    }

    public hasKey(config: HttpRequestConfig): boolean {
        // 白名单接口不添加到取消队列
        if (isNoCancel(config)) {
            return false;
        }

        const key = getRepositoryKey(config);
        return this.requestRepository.has(key);
    }

    /**
     * 移除请求
     * @param config 请求配置
     */
    public remove(config: HttpRequestConfig): void {
        if (isNoCancel(config)) {
            return;
        }

        const key = getRepositoryKey(config);
        const controller = this.requestRepository.get(key);
        if (controller) {
            this.requestRepository.delete(key);
        }
    }

    /**
     * 取消并移除请求（用于主动取消场景）
     */
    public cancelAndRemove(config: HttpRequestConfig): void {
        if (isNoCancel(config)) {
            return;
        }

        const key = getRepositoryKey(config);
        const controller = this.requestRepository.get(key);

        if (controller) {
            controller.abort();
            this.requestRepository.delete(key);
            this.logger.info(`取消请求: ${key}`);
        }
    }

    /**
     * 清除所有等待中的请求
     */
    public clear(): void {
        this.requestRepository.forEach((abortController, key) => {
            if (abortController) {
                abortController.abort();
                this.logger.info(`取消请求: ${key}`);
            }

        });
        this.requestRepository.clear();
    }

    /**
     * 重置
     */
    public reset(): void {
        this.requestRepository.clear();
    }

    // 新增：获取当前 pending 请求数量
    public getPendingCount(): number {
        return this.requestRepository.size;
    }

}


class HttpRequest {

    private logger = LoggerFactory.create('common-tools-http-request');

    private instance: AxiosInstance;
    private tokenManager: TokenManager;
    private requestManager: RequestManager;
    private readonly config: HttpRequestConfig;

    constructor(config: HttpRequestConfig) {
        this.config = config;
        this.instance = axios.create(config);
        this.tokenManager = new TokenManager(this, config);
        this.requestManager = new RequestManager();
        this.setupInterceptors();
    }

    /**
     * @description: Interceptor configuration 拦截器配置
     */
    setupInterceptors(): void {

        const { interceptors } = this.config;
        this.instance.interceptors.request.use(
            async (config: HttpRequestConfig) => {

                const mergedConfig = mergeConfig(this.config, config);
                const tracedConfig = addTracingHeaders(mergedConfig);
                const finalConfig = await this.addTokenHeader(tracedConfig);
                // 添加当前请求
                this.requestManager.append(finalConfig);

                // 显示 loading（可选）
                if (finalConfig.showLoading) {
                    // 可以集成你的 loading 逻辑
                    // this.showLoading();
                }
                if (interceptors?.requestInterceptor) {
                    return interceptors.requestInterceptor(finalConfig) || finalConfig;
                }
                return finalConfig;
            },
            (error) => {
                // 移除失败的请求
                if (error.config) {
                    this.requestManager.cancelAndRemove(error.config as HttpRequestConfig);
                }
                // 关闭 loading
                if (error.config?.showLoading) {
                    // this.hideLoading();
                }
                // 处理请求拦截器错误
                if (error?.code === 'NO_TOKEN') {
                    this.handleNoToken();
                }
                if (interceptors?.requestInterceptorCatch) {
                    return interceptors.requestInterceptorCatch(error);
                }
                return Promise.reject(error);
            }
        );

        this.instance.interceptors.response.use(
            (res: AxiosResponse<Result<unknown>>) => {
                const config = res.config as HttpRequestConfig;
                if (res.config) {
                    this.requestManager.remove(config);
                }
                // 关闭 loading
                if (config.showLoading) {
                    // this.hideLoading();
                }

                if (interceptors?.responseInterceptor) {
                    return interceptors.responseInterceptor(res);
                }

                return res;
            },
            (error: AxiosError<Result<unknown>>) => {
                if (axios.isCancel(error)) {
                    this.logger.info('请求已取消:', error.message);

                    if (error.config) {
                        this.requestManager.remove(error.config);
                    }

                    return Promise.reject({ isCanceled: true, message: error.message });
                }

                // 移除失败的请求
                if (error.config) {
                    this.requestManager.remove(error.config);
                }

                // Token 过期处理
                if (error.config) {
                    const tokenError = this.handleTokenExpiration(error);
                    if (tokenError) {
                        return tokenError;
                    }
                }

                // 关闭 loading
                if ((error.config as HttpRequestConfig)?.showLoading) {
                    // this.hideLoading();
                }

                // 自定义错误处理（保留你原有的完整逻辑）
                if (interceptors?.responseInterceptorCatch) {
                    return interceptors.responseInterceptorCatch(error);
                }

                return Promise.reject(error);
            }
        );
    }

    /**
     * 添加 Token 到请求头
     */
    private async addTokenHeader(config: HttpRequestConfig): Promise<HttpRequestConfig> {
        // 如果配置明确不需要 token，跳过
        if (config.withToken === false) {
            return config;
        }

        // 检查白名单（不需要 token 的接口）
        if (config.whiteList?.withToken?.some(pattern =>
            config.url?.includes(pattern)
        )) {
            return config;
        }

        const token = this.tokenManager.getAccessToken();
        const needsRefresh = this.tokenManager.needRefresh();
        const isRefreshing = this.tokenManager.getIsRefreshing();

        if (isRefreshing) {
            return this.waitForTokenRefresh(config);
        }

        // 情况2：没有 Token 且不需要刷新 → 用户未登录
        if (!token && !needsRefresh) {
            const error = new AxiosError('NO_TOKEN');
            error.code = 'NO_TOKEN';
            throw error;
        }

        if (!token && needsRefresh) {
            return this.handleTokenRefreshFailed(config);
        }

        if (token && needsRefresh) {
            // 异步触发刷新（不阻塞当前请求）
            this.triggerRefreshIfNeeded();
        }

        // 添加到请求头
        const headers = new AxiosHeaders(config.headers);
        headers.set(CONSTS.DEFAULT_AUTHENTICATION_HEADER, `${CONSTS.DEFAULT_AUTHENTICATION_HEADER_VALUE_PREFIX} ${token}`);

        return { ...config, headers };
    }

    /**
     * 等待 Token 刷新完成
     */
    private async waitForTokenRefresh(config: HttpRequestConfig): Promise<HttpRequestConfig> {
        return new Promise((resolve, reject) => {
            this.tokenManager.addPendingRequest({
                config,
                resolve: () => {
                    const newToken = this.tokenManager.getAccessToken();
                    if (newToken) {
                        const headers = new AxiosHeaders(config.headers);
                        headers.set(CONSTS.DEFAULT_AUTHENTICATION_HEADER, `${CONSTS.DEFAULT_AUTHENTICATION_HEADER_VALUE_PREFIX} ${newToken}`);
                        resolve({ ...config, headers });
                    } else {
                        reject(new Error('Token refresh failed'));
                    }
                },
                reject,
            });
        });
    }

    /**
     * 处理 Token 刷新失败的情况
     */
    private handleTokenRefreshFailed(config: HttpRequestConfig): Promise<HttpRequestConfig> {
        return new Promise((resolve, reject) => {
            // 尝试刷新
            this.tokenManager.refreshToken()
                .then((newToken) => {
                    const headers = new AxiosHeaders(config.headers);
                    headers.set(CONSTS.DEFAULT_AUTHENTICATION_HEADER, `${CONSTS.DEFAULT_AUTHENTICATION_HEADER_VALUE_PREFIX} ${newToken}`);
                    resolve({ ...config, headers });
                })
                .catch((error) => {
                    // 刷新失败，触发未授权处理
                    this.handleNoToken();
                    reject(error);
                });
        });
    }

    /**
     * 处理未授权（无 Token）情况
     */
    private handleNoToken(): void {
        // 获取配置
        const authConfig = this.config.authPaths || {};
        const loginPath = authConfig.loginPath || this.config.loginPath || '/login';
        const redirectKey = authConfig.redirectKey || 'redirect';

        // 保存当前页面
        const redirectUrl = this.getCurrentUrl();

        // 优先使用自定义回调
        if (this.config.onUnauthorized) {
            this.config.onUnauthorized();
            return;
        }

        // 尝试使用前端路由
        if (this.config.router) {
            this.config.router.push({
                path: loginPath,
                query: { [redirectKey]: redirectUrl },
            });
            return;
        }

        // 默认行为：直接跳转
        const url = new URL(loginPath, window.location.origin);
        url.searchParams.set(redirectKey, redirectUrl);
        window.location.href = url.toString();
    }

    private getCurrentUrl(): string {
        if (typeof window !== 'undefined') {
            return window.location.href;
        }
        return '';
    }

    /**
     * 触发刷新（如果还没在刷新）
     */
    private triggerRefreshIfNeeded(): void {
        if (!this.tokenManager.getIsRefreshing()) {
            this.tokenManager.refreshToken().catch((error) => {
                this.logger.error('Token refresh failed in triggerRefreshIfNeeded:', error);
            });
        }
    }

    /**
     * 处理 Token 过期
     */
    private handleTokenExpiration(error: AxiosError<Result<unknown>>): Promise<unknown> | null {
        const response = error?.response;

        // 检查是否是 Token 过期错误（通常是 401 或 403）
        if (response?.status === HttpStatus.HTTP_401_UNAUTHORIZED) {
            // 获取原始请求配置
            const config = response.config as HttpRequestConfig;

            // 如果已经跳过刷新，直接拒绝
            if (config.skipRefresh) {
                return null;
            }

            // 如果需要刷新 Token
            if (this.tokenManager.needRefresh()) {
                // 将请求加入等待队列
                return new Promise((resolve, reject) => {
                    this.tokenManager.addPendingRequest({
                        config,
                        resolve,
                        reject,
                    });

                    // 触发刷新
                    this.tokenManager.refreshToken().catch((error) => {
                        this.logger.error('Token refresh failed in handleTokenExpiration:', error);
                    });
                });
            }
        }
        return null;
    }

    /**
     * 基础请求封装
     * @param config
     */
    request<T = unknown, R = unknown>(config: HttpRequestConfig): Promise<R> {
        return this.instance.request<T, R>(config);
    }

    /**
     * get 请求封装
     * @param config
     * @returns
     */
    get<T = unknown>(config: HttpRequestConfig): Promise<T> {
        return this.request({ ...config, method: RequestMethodEnum.GET });
    }

    /**
     * post 请求封装
     * @param config
     * @returns
     */
    post<T = unknown>(config: HttpRequestConfig): Promise<T> {
        return this.request({ ...config, method: RequestMethodEnum.POST });
    }

    /**
     * put 请求封装
     * @param config
     * @returns
     */
    put<T = unknown>(config: HttpRequestConfig): Promise<T> {
        return this.request({ ...config, method: RequestMethodEnum.PUT });
    }

    /**
     * delete 请求封装
     * @param config
     * @returns
     */
    delete<T = unknown>(config: HttpRequestConfig): Promise<T> {
        return this.request({ ...config, method: RequestMethodEnum.DELETE });
    }

    /**
     * patch 请求封装
     * @param config
     * @returns
     */
    patch<T = unknown>(config: HttpRequestConfig): Promise<T> {
        return this.request({ ...config, method: RequestMethodEnum.PATCH });
    }

    /**
     * upload 请求封装
     * @param config
     * @returns
     */
    upload<T = unknown>(config: HttpRequestConfig): Promise<T> {
        return this.request({
            ...config,
            headers: { 'Content-Type': 'multipart/form-data'} as AxiosRequestHeaders,
            method: RequestMethodEnum.POST
        });
    }

    // 新增：清理所有请求（供路由守卫使用）
    public cancelAllRequests(reason?: string): void {
        console.log(`清理所有请求: ${reason || '路由切换'}`);
        this.requestManager.clear();
    }

    // 新增：获取 pending 请求数量
    public getPendingCount(): number {
        return this.requestManager.getPendingCount();
    }

}

export default HttpRequest
