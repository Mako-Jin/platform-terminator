import React, {useState, useEffect} from 'react';
import {Layout, Switch, Tooltip} from 'antd';
import {Cloud, CloudOff} from '@ant-design/icons';
import {getGlobalState, updateGlobalState} from '/@/components/qiankun/state';
import {LoggerFactory} from 'common-tools';
import './index.scss'; // 使用 CSS Modules 避免样式冲突

const { Header: AntHeader } = Layout;
const Logger = LoggerFactory.create('header');

interface HeaderProps {
    scrolled: boolean; // 从父组件接收滚动状态
}

const Header: React.FC<HeaderProps> = ({ scrolled }) => {
    const [weatherEnabled, setWeatherEnabled] = useState(true);

    // 初始化时获取全局状态
    useEffect(() => {
        const globalState = getGlobalState();
        setWeatherEnabled(globalState.weatherEnabled ?? true);

        // 监听全局状态变化（定期检查）
        const intervalId = setInterval(() => {
            const currentState = getGlobalState();
            if (currentState.weatherEnabled !== weatherEnabled) {
                setWeatherEnabled(currentState.weatherEnabled);
            }
        }, 500);

        return () => clearInterval(intervalId);
    }, [weatherEnabled]);

    // 切换天气开关
    const handleWeatherToggle = (checked: boolean) => {
        Logger.info('[Header] 天气开关状态:', checked);
        updateGlobalState({ weatherEnabled: checked });
    };

    return (
        // 根据 scrolled 状态动态添加类名
        <AntHeader className={`header ${scrolled ? 'header-scrolled' : ''}`}>
            <div className="brand">
                🏯 华夏天工
            </div>
            
            <div className="header-controls">
                <Tooltip title={weatherEnabled ? '关闭天气效果' : '开启天气效果'}>
                    <div className="weather-toggle">
                        {weatherEnabled ? <Cloud className="weather-icon" /> : <CloudOff className="weather-icon" />}
                        <Switch
                            checked={weatherEnabled}
                            onChange={handleWeatherToggle}
                            checkedChildren="开"
                            unCheckedChildren="关"
                        />
                    </div>
                </Tooltip>
            </div>
        </AntHeader>
    );
};

export default Header;