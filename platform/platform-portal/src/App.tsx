
import './App.scss';
import { LoggerFactory } from 'common-shared';
import { QiankunGuard } from '/@/components/qiankun/QiankunGuard';

const Logger = LoggerFactory.create("platform-portal-app");

function App() {
        async function initConsole() {
                // Logger.updateConfig(LoggerFactory.getEnvConfig());
                //
                // await Logger.showBanner({
                //         ...LoggerFactory.getEnvBannerConfig(),
                //         asciiArtPath: './banner.txt'
                // });

                Logger.techTable([
                        { Layer: 'Build', Technology: 'Vite 6.0', Details: 'ES Modules, HMR' },
                        { Layer: 'UI Framework', Technology: 'React 19', Details: 'Concurrent Mode' },
                        { Layer: 'Micro Frontend', Technology: 'Qiankun 2.10', Details: 'Sandbox Isolation' }
                ]);

                Logger.group('System Info', () => {
                        Logger.keyValue('Environment', import.meta.env.MODE);
                        Logger.keyValue('Platform', 'Web Portal');
                });

                Logger.info('LOADING', 'Initializing application...');
                Logger.success('DONE', 'Application ready');

                Logger.divider('═', 60);
        }

        initConsole().then();

        return (
            <QiankunGuard>
                <div>111111111</div>
            </QiankunGuard>
        );
}

export default App;
