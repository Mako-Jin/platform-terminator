import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startQiankun } from './qiankun';
import './index.scss';
import App from './App.tsx';

// 启动乾坤
startQiankun();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
