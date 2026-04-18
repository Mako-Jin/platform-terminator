import './App.scss'
import Layout from "/@/layout/index.tsx";
// import { LoggerFactory, Logger } from 'common-shared/utils/logger';
import { LoggerFactory } from 'common-shared/utils/logger';
import { Logger } from 'common-shared/utils/logger';

function App() {
        // 方式一：使用全局单例
        async function initConsole() {
                // 更新配置（从环境变量读取）
                Logger.updateConfig(LoggerFactory.getEnvConfig());

                // 可选：切换主题
                // consoleStylish.updateTheme(DARK_THEME);

                // 显示 Banner（从文件加载 ASCII 艺术）
                await Logger.showBanner({
                        ...LoggerFactory.getEnvBannerConfig(),
                        asciiArtPath: './banner.txt'  // 从 public 目录读取
                });

                // 输出技术栈表格
                Logger.techTable([
                        { Layer: 'Build', Technology: 'Vite 6.0', Details: 'ES Modules, HMR' },
                        { Layer: '3D Engine', Technology: 'Three.js 0.182', Details: 'WebGLRenderer' },
                        { Layer: 'Animation', Technology: 'GSAP 3.14', Details: 'Tweening & Timelines' }
                ]);

                // 分组输出
                Logger.group('System Info', () => {
                        Logger.keyValue('Node Version', import.meta.env.version);
                        Logger.keyValue('Platform', import.meta.env.platform);
                });

                // 普通日志
                Logger.info('LOADING', 'Initializing application...');
                Logger.success('DONE', 'Application ready');

                // 分割线
                Logger.divider('═', 60);
        }

        initConsole().then();

  return (
      <div className="App">
          <Layout></Layout>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
          <br/>
      </div>
  )
}

export default App
