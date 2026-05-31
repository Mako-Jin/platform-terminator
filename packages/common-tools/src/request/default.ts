import axios, {AxiosHeaders, type AxiosResponse} from "axios";
import HttpRequest from "./core";
import {HttpStatus, type HttpRequestConfig, type Interceptor, type Result, ContentTypeEnum} from "./types";
import {LoggerFactory} from "../utils";
import {localStorage} from "../storage";
import {CONSTS} from "./constants";


const logger = LoggerFactory.create("common-tools-request-default");


const defaultInterceptors: Interceptor<unknown> = {

    /**
     * @description: 请求拦截器处理
     */
    requestInterceptor: (config: HttpRequestConfig): HttpRequestConfig => {
        // GET请求自动添加时间戳防缓存（可通过配置关闭）
        const autoTimestamp = config.globalConfig?.autoTimestamp !== false;
        if (autoTimestamp && config.method?.toLowerCase() === 'get' && !config.params?.noCache) {
            config.params = {
                ...config.params,
                timestamp: Date.now()
            };
        }

        return config;
    },

    requestInterceptorCatch: (error: Error): Promise<void> => {
        logger.info('请求失败的拦截', error)
        return Promise.reject(error)
    },

    /**
     * @description: 响应拦截器处理
     */
    responseInterceptor: <R = unknown>(response: AxiosResponse<Result<unknown>>): R | Promise<R> => {
        const config = response.config as HttpRequestConfig;
        const successCode = config.successCode || CONSTS.DEFAULT_RESPONSE_CODE_SUCCESS;
        const successCodes = Array.isArray(successCode) ? successCode : [successCode];
        const messageHandler = config.messageHandler;
        if (response.status === HttpStatus.HTTP_200_OK) {
            const data = response.data;
            if (!successCodes.includes(data.code)) {
                messageHandler?.error(data.msg);
                return Promise.reject({ code: data.code, msg: data.msg, data: null } as Result<unknown>) as Promise<R>;
            } else {
                messageHandler?.success(data.msg || '请求成功');
                return Promise.resolve(data.data ?? true) as Promise<R>;
            }
        }
        messageHandler?.error(`${response.status}:${response.statusText}`);
        return Promise.reject(response) as Promise<R>;
    },

    /**
     * @description: 响应错误处理
     */
    responseInterceptorCatch: (error: Error): void => {

        // 关键：取消的请求直接返回，不显示错误
        if (axios.isCancel(error)) {
            logger.warn('请求已被取消');
            return;
        }

        // 检查是否是重复请求被拦截
        if (((error as unknown) as Record<string, unknown>)?.type === 'REPEATED_REQUEST') {
            logger.warn('重复请求已被取消');
            return;
        }

        if(axios.isAxiosError(error)) {
            const config = error.config as HttpRequestConfig;
            const messageHandler = config.messageHandler;
            const status = error.response?.status;

            if (status === HttpStatus.HTTP_404_NOT_FOUND) {
                messageHandler?.error('资源不存在！');
            } else if (status === HttpStatus.HTTP_500_INTERNAL_SERVER_ERROR) {
                if (error.response?.data) {
                    logger.error("后端500响应", error.response.data);
                    const errorData = error.response.data as Result<unknown>;
                    messageHandler?.error(errorData.msg || '服务内部异常！');
                } else {
                    messageHandler?.error('服务内部异常！');
                }
            } else if (status === HttpStatus.HTTP_400_BAD_REQUEST) {
                if (error.response?.data) {
                    logger.error("后端400响应", error.response.data);
                    const errorData = error.response.data as Result<unknown>;
                    messageHandler?.error(errorData.msg || '请求不合规！');
                } else {
                    messageHandler?.error('请求不合规！');
                }
            } else if (status === HttpStatus.HTTP_401_UNAUTHORIZED) {
                // 401 由 core.ts 的 TokenManager 统一处理，这里可以添加额外的日志
                logger.warn('未授权访问，将跳转到登录页');
            } else if (status === HttpStatus.HTTP_403_FORBIDDEN) {
                if (error.response?.data) {
                    const errorData = error.response.data as Result<unknown>;
                    messageHandler?.error(errorData.msg || '权限校验异常！');
                } else {
                    messageHandler?.error('权限校验异常！');
                }
            } else {
                messageHandler?.error('网络连接超时！');
            }
        }
    },

}


const defaultRequestConfig = {
    baseURL: "https://www.npurbcc.com/server",
    // baseURL: "http://127.0.0.1:6680",
    timeout: 30 * 1000,
    headers: new AxiosHeaders({ 'Content-Type': ContentTypeEnum.JSON }),
    interceptors: defaultInterceptors,

    // 存储实现（默认使用 localStorage）
    storage: localStorage,

    // Token 管理配置
    tokenConfig: {
        enabled: true,
        refreshUrl: '/api/auth/refreshToken',
        expiresThreshold: 5 * 60 * 1000, // 5分钟过期阈值
        refreshExpiresIn: 7 * 24 * 60 * 60 * 1000, // 7天刷新token有效期
        storageKeys: {
            tokenDataKey: CONSTS.DEFAULT_TOKEN_DATA_KEY,
            accessTokenKey: CONSTS.DEFAULT_ACCESS_TOKEN_KEY,
        },
    },

    // 成功响应码（支持单个或多个）
    successCode: CONSTS.DEFAULT_RESPONSE_CODE_SUCCESS,

    // 白名单配置
    whiteList: {
        withToken: ['/api/auth/login', '/api/auth/register'], // 不需要带token的接口
        noCancel: ['/api/upload', '/api/large-file'], // 不参与取消逻辑的接口
    },

    // 全局配置
    globalConfig: {
        autoTimestamp: true, // GET请求自动添加时间戳
        enableLog: true, // 启用日志
        verboseLog: false, // 禁用详细日志
    },

    // 认证路径配置
    authPaths: {
        loginPath: '/login',
        redirectKey: 'redirect',
    },
} as HttpRequestConfig


const createHttpRequest = () => {
    return new HttpRequest(defaultRequestConfig)
}

export default createHttpRequest