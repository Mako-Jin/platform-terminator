import {JSX, useEffect, useState} from 'react';
import { startQiankun } from '.';
import { message } from 'antd';
import { LoggerFactory } from 'common-tools';

const Logger = LoggerFactory.create("qiankun-guard");

export const QiankunGuard: ({children}: { children: JSX.Element }) => (JSX.Element) = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initQiankun = async () => {
      try {
        Logger.info('[QiankunGuard] 正在初始化乾坤...');
        await startQiankun();
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
