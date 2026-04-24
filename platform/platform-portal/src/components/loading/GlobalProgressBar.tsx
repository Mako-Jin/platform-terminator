import { useEffect, useState } from 'react';
import { useLoading, LoadingPhase, PHASES } from './LoadingContext';
import './GlobalProgressBar.scss';

/**
 * 全局加载进度条组件
 * 显示在页面顶部，展示系统初始化进度
 */
export const GlobalProgressBar: React.FC = () => {
  const { state } = useLoading();
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // 完成后延迟隐藏
  useEffect(() => {
    if (state.currentPhase === LoadingPhase.COMPLETE && state.progress >= 100) {
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setVisible(false);
        }, 500);
      }, 800);
    }
  }, [state.currentPhase, state.progress]);

  // 错误时保持显示
  if (state.currentPhase === LoadingPhase.ERROR) {
    return (
      <div className="global-progress-bar error">
        <div className="progress-container">
          <div
            className="progress-fill error"
            style={{ width: '100%' }}
          />
        </div>
        <div className="progress-message">
          <span className="error-icon">⚠️</span>
          <span>{state.message}</span>
        </div>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div className={`global-progress-bar ${fadeOut ? 'fade-out' : ''}`}>
      {/* 进度条 */}
      <div className="progress-container">
        <div
          className="progress-fill"
          style={{
            width: `${state.progress}%`,
            transition: state.progress > 90 ? 'none' : 'width 0.3s ease-out'
          }}
        />
        {state.progress < 90 && (
          <div className="progress-glow" style={{ left: `${state.progress}%` }} />
        )}
      </div>

      {/* 进度信息 */}
      <div className="progress-info">
        <div className="progress-message">{state.message}</div>
        <div className="progress-percentage">{state.progress}%</div>
      </div>

      {/* 阶段指示器 */}
      <div className="phase-indicators">
        {PHASES.filter(p => p.key !== LoadingPhase.ERROR).map((phase) => {
          const isCompleted = state.progress > getPhaseEndProgress(phase.key);
          const isCurrent = state.currentPhase === phase.key;

          return (
            <div
              key={phase.key}
              className={`phase-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="phase-icon">{phase.icon}</div>
              <div className="phase-label">{phase.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 辅助函数：计算某个阶段结束时的总进度
function getPhaseEndProgress(phase: LoadingPhase): number {
  const index = PHASES.findIndex(p => p.key === phase);
  if (index === -1) return 0;

  let weight = 0;
  for (let i = 0; i <= index; i++) {
    weight += PHASES[i].weight;
  }
  return weight;
}
