import {JSX, useEffect, useState} from 'react';
import {startQiankun, toggleWeatherApp} from '.';
import {getGlobalState} from './state';
import {message} from 'antd';
import {LoggerFactory} from 'common-tools';

const Logger = LoggerFactory.create("qiankun-guard");

export const QiankunGuard: ({children}: { children: JSX.Element }) => (JSX.Element) = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherEnabled, setWeatherEnabled] = useState(true);

  useEffect(() => {
    const initQiankun = async () => {
      try {
        // 获取全局状态中的天气配置
        const globalState = getGlobalState();
        const initialWeatherEnabled = globalState.weatherEnabled ?? true;
        setWeatherEnabled(initialWeatherEnabled);
        
        Logger.info('[QiankunGuard] 正在初始化乾坤...');
        Logger.info('[QiankunGuard] 天气功能:', initialWeatherEnabled ? '启用' : '禁用');
        
        await startQiankun({ weatherEnabled: initialWeatherEnabled });
        setInitialized(true);
        Logger.success('[QiankunGuard] 乾坤初始化成功');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        Logger.error('[QiankunGuard] 乾坤初始化失败:', err);
        setError(errorMsg);
        message.error(`微前端初始化失败: ${errorMsg}`);
      }
    };

    initQiankun().then();
  }, []);

  // 监听全局状态变化
  useEffect(() => {
    // qiankun 的 onGlobalStateChange 返回值不是函数，使用本地状态监听
    // 通过 getGlobalState 定期检查状态变化（简单方案）
    const intervalId = setInterval(() => {
      const globalState = getGlobalState();
      if (globalState.weatherEnabled !== weatherEnabled) {
        Logger.info('[QiankunGuard] 天气开关状态变化:', globalState.weatherEnabled);
        setWeatherEnabled(globalState.weatherEnabled);
        toggleWeatherApp(globalState.weatherEnabled).then();
      }
    }, 500); // 每 500ms 检查一次

    return () => clearInterval(intervalId);
  }, [weatherEnabled]);

  if (error) {
    return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#ff4d4f'
        }}>
          <h2>⚠️ 系统初始化失败</h2>
          <p>{error}</p>
          <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                cursor: 'pointer'
              }}
          >
            重新加载
          </button>
        </div>
    );
  }

  if (!initialized) {
    return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            color: 'white',
            fontSize: '18px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '20px' }}>⚜️</div>
            <div>正在初始化系统...</div>
          </div>
        </div>
    );
  }

  return <>{children}</>;
};