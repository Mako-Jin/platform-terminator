import { createContext, useContext, useReducer, useCallback } from 'react';
import { LoggerFactory } from '@platform/common-tools';

const logger = LoggerFactory.create('LoadingManager');

// 加载阶段定义
export enum LoadingPhase {
  INIT = 'init',
  QIANKUN = 'qiankun',
  CONFIG = 'config',
  AUTH = 'auth',
  COMPLETE = 'complete',
  ERROR = 'error',
}

// 每个阶段的配置
interface PhaseConfig {
  key: LoadingPhase;
  label: string;
  weight: number; // 权重，用于计算总进度
  icon: string;
}

export const PHASES: PhaseConfig[] = [
  { key: LoadingPhase.INIT, label: '系统初始化', weight: 10, icon: '🚀' },
  { key: LoadingPhase.QIANKUN, label: '加载微前端框架', weight: 30, icon: '⚜️' },
  { key: LoadingPhase.CONFIG, label: '获取用户配置', weight: 25, icon: '⚙️' },
  { key: LoadingPhase.AUTH, label: '验证身份', weight: 25, icon: '🔐' },
  { key: LoadingPhase.COMPLETE, label: '准备就绪', weight: 10, icon: '✨' },
];

// 加载状态
interface LoadingState {
  currentPhase: LoadingPhase;
  progress: number; // 0-100
  phaseProgress: Record<LoadingPhase, number>; // 每个阶段的进度 0-100
  message: string;
  error: string | null;
  startTime: number;
}

// Action 类型
type LoadingAction =
  | { type: 'SET_PHASE'; phase: LoadingPhase; progress?: number }
  | { type: 'UPDATE_PHASE_PROGRESS'; phase: LoadingPhase; progress: number }
  | { type: 'SET_MESSAGE'; message: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

// 初始状态
const initialState: LoadingState = {
  currentPhase: LoadingPhase.INIT,
  progress: 0,
  phaseProgress: {
    [LoadingPhase.INIT]: 0,
    [LoadingPhase.QIANKUN]: 0,
    [LoadingPhase.CONFIG]: 0,
    [LoadingPhase.AUTH]: 0,
    [LoadingPhase.COMPLETE]: 0,
    [LoadingPhase.ERROR]: 0,
  },
  message: '正在启动...',
  error: null,
  startTime: Date.now(),
};

// Reducer
function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'SET_PHASE': {
      const newPhase = action.phase;
      const phaseIndex = PHASES.findIndex(p => p.key === newPhase);

      // 计算已完成阶段的总权重
      let completedWeight = 0;
      for (let i = 0; i < phaseIndex; i++) {
        completedWeight += PHASES[i].weight;
      }

      // 当前阶段的进度
      const currentPhaseProgress = action.progress || 0;
      const currentWeight = PHASES[phaseIndex]?.weight || 0;

      // 总进度 = 已完成权重 + 当前阶段权重 * 当前阶段进度
      const totalProgress = completedWeight + (currentWeight * currentPhaseProgress / 100);

      logger.debug(`阶段切换: ${newPhase}`, {
        phase: newPhase,
        progress: Math.round(totalProgress),
        phaseProgress: currentPhaseProgress
      });

      return {
        ...state,
        currentPhase: newPhase,
        progress: Math.min(Math.round(totalProgress), 100),
        phaseProgress: {
          ...state.phaseProgress,
          [newPhase]: currentPhaseProgress,
        },
        message: `${PHASES[phaseIndex]?.icon} ${PHASES[phaseIndex]?.label || '加载中'}...`,
        error: null,
      };
    }

    case 'UPDATE_PHASE_PROGRESS': {
      const { phase, progress } = action;
      const phaseIndex = PHASES.findIndex(p => p.key === phase);

      if (phaseIndex === -1) return state;

      // 重新计算总进度
      let completedWeight = 0;
      for (let i = 0; i < phaseIndex; i++) {
        completedWeight += PHASES[i].weight;
      }

      const currentWeight = PHASES[phaseIndex].weight;
      const totalProgress = completedWeight + (currentWeight * progress / 100);

      return {
        ...state,
        progress: Math.min(Math.round(totalProgress), 100),
        phaseProgress: {
          ...state.phaseProgress,
          [phase]: progress,
        },
      };
    }

    case 'SET_MESSAGE':
      return { ...state, message: action.message };

    case 'SET_ERROR':
      return {
        ...state,
        currentPhase: LoadingPhase.ERROR,
        error: action.error,
        message: `❌ ${action.error}`,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Context
interface LoadingContextType {
  state: LoadingState;
  setPhase: (phase: LoadingPhase, progress?: number) => void;
  updatePhaseProgress: (phase: LoadingPhase, progress: number) => void;
  setMessage: (message: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

// Provider 组件
export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  const setPhase = useCallback((phase: LoadingPhase, progress?: number) => {
    dispatch({ type: 'SET_PHASE', phase, progress });
  }, []);

  const updatePhaseProgress = useCallback((phase: LoadingPhase, progress: number) => {
    dispatch({ type: 'UPDATE_PHASE_PROGRESS', phase, progress: Math.min(progress, 100) });
  }, []);

  const setMessage = useCallback((message: string) => {
    dispatch({ type: 'SET_MESSAGE', message });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <LoadingContext.Provider value={{ state, setPhase, updatePhaseProgress, setMessage, setError, reset }}>
      {children}
    </LoadingContext.Provider>
  );
};

// Hook
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export { LoadingContext };
