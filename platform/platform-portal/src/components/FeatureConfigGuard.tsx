import { useEffect, useState, useCallback } from 'react';
import { globalActions } from './qiankun/apps';
import { updateApps } from './qiankun';
import { message } from 'antd';
import { Logger } from 'common-tools/utils/logger';

interface FeatureConfig {
  elementalWeather: boolean;
  [key: string]: any;
}

interface FeatureConfigGuardProps {
  children: React.ReactNode;
  onConfigLoaded?: (config: FeatureConfig) => void;
}

/**
 * 功能配置守卫
 * 从后端获取用户功能配置，并动态注册子应用
 */
export const FeatureConfigGuard: React.FC<FeatureConfigGuardProps> = ({
  children,
  onConfigLoaded
}) => {
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState<FeatureConfig | null>(null);

  // 从后端获取用户功能配置
  const fetchUserFeatureConfig = useCallback(async (): Promise<FeatureConfig> => {
    try {
      // TODO: 替换为实际的 API 调用
      // const response = await fetch('/api/user/feature-config');
      // if (!response.ok) {
      //   throw new Error('获取配置失败');
      // }
      // return await response.json();

      // 模拟 API 调用
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            elementalWeather: true, // 从后端获取的配置
            // 其他功能配置...
          });
        }, 100);
      });
    } catch (error) {
      Logger.error('[FeatureConfigGuard] 获取用户配置失败:', error);
      message.error('获取用户配置失败，使用默认配置');
      return {
        elementalWeather: false, // 失败时默认关闭
      };
    }
  }, []);

  // 更新功能配置
  const updateFeatureConfig = useCallback(async (newConfig: Partial<FeatureConfig>) => {
    try {
      Logger.log('[FeatureConfigGuard] 更新功能配置:', newConfig);

      // 1. 调用后端 API 保存配置
      // await fetch('/api/user/update-feature-config', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newConfig),
      // });

      // 2. 更新全局状态
      const currentState = globalActions.getGlobalState();
      const updatedConfig = { ...currentState.featureConfig, ...newConfig };

      globalActions.setGlobalState({
        ...currentState,
        featureConfig: updatedConfig,
      });

      // 3. 重新注册子应用
      await updateApps(updatedConfig);

      // 4. 更新本地状态
      setConfig(updatedConfig);

      message.success('配置已更新');
    } catch (error) {
      console.error('[FeatureConfigGuard] 更新配置失败:', error);
      message.error('配置更新失败');
      throw error;
    }
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      const userConfig = await fetchUserFeatureConfig();
      setConfig(userConfig);
      setLoaded(true);

      if (onConfigLoaded) {
        onConfigLoaded(userConfig);
      }

      console.log('[FeatureConfigGuard] 配置加载完成:', userConfig);
    };

    loadConfig().then();
  }, [fetchUserFeatureConfig, onConfigLoaded]);

  // 将方法暴露给子组件
  const contextValue = {
    config,
    updateFeatureConfig,
    isElementalWeatherEnabled: config?.elementalWeather || false,
  };

  if (!loaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>加载用户配置中...</div>
      </div>
    );
  }

  return (
    <FeatureConfigContext.Provider value={contextValue}>
      {children}
    </FeatureConfigContext.Provider>
  );
};

// 创建 Context
import { createContext, useContext } from 'react';

const FeatureConfigContext = createContext<{
  config: FeatureConfig | null;
  updateFeatureConfig: (config: Partial<FeatureConfig>) => Promise<void>;
  isElementalWeatherEnabled: boolean;
}>({
  config: null,
  updateFeatureConfig: async () => {},
  isElementalWeatherEnabled: false,
});

// Hook for consuming the context
export const useFeatureConfig = () => {
  const context = useContext(FeatureConfigContext);
  if (!context) {
    throw new Error('useFeatureConfig must be used within FeatureConfigGuard');
  }
  return context;
};
