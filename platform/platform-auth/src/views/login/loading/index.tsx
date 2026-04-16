// Loading.tsx
import React, { useEffect, useState } from 'react';
import './index.scss';

interface LoadingProps {
    onLoadingComplete?: () => void;
    duration?: number; // 持续时间（毫秒）
}

const Loading: React.FC<LoadingProps> = ({ onLoadingComplete, duration = 2000 }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onLoadingComplete?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onLoadingComplete]);

    if (!visible) return null;

    return (
        <div className="chinese-loading-overlay">
            <div className="chinese-loading-container">
                {/* 中式纹样装饰 - 左上 */}
                <div className="corner-decoration corner-tl"/>
                {/* 中式纹样装饰 - 右上 */}
                <div className="corner-decoration corner-tr"/>
                {/* 中式纹样装饰 - 左下 */}
                <div className="corner-decoration corner-bl"/>
                {/* 中式纹样装饰 - 右下 */}
                <div className="corner-decoration corner-br"/>

                {/* 主标题 */}
                <div className="loading-title">⚜️ 启 · 城 门 将 开 ⚜️</div>

                {/* 中式灯笼动画 */}
                <div className="lantern-container">
                    <div className="lantern left-lantern">
                        <div className="lantern-body">
                            <div className="lantern-glow"/>
                            <div className="lantern-text">福</div>
                        </div>
                        <div className="lantern-tassel"/>
                    </div>
                    <div className="lantern right-lantern">
                        <div className="lantern-body">
                            <div className="lantern-glow"/>
                            <div className="lantern-text">瑞</div>
                        </div>
                        <div className="lantern-tassel"/>
                    </div>
                </div>

                {/* 加载进度条 - 中式风格 */}
                <div className="loading-progress-container">
                    <div className="progress-bar">
                        <div className="progress-fill"/>
                    </div>
                    <div className="progress-text">灵 境 加 载 中</div>
                </div>

                {/* 底部印章效果 */}
                <div className="loading-seal">⚡ 古 韵 天 工 ⚡</div>

                {/* 粒子光点效果 */}
                <div className="particles">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className={`particle particle-${i}`}/>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Loading;
