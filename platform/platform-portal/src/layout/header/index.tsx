import React from 'react';
import { Layout } from 'antd';
import './index.css'; // 使用 CSS Modules 避免样式冲突

const { Header: AntHeader } = Layout;

interface HeaderProps {
    scrolled: boolean; // 从父组件接收滚动状态
}

const Header: React.FC<HeaderProps> = ({ scrolled }) => {
    return (
        // 根据 scrolled 状态动态添加类名
        <AntHeader className={`header ${scrolled ? 'header-scrolled' : ''}`}>
            <div className="brand">
                🏯 华夏天工
            </div>
        </AntHeader>
    );
};

export default Header;


