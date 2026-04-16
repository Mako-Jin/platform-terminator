import React, { useState, useEffect } from 'react';
import { Layout as AntLayout } from 'antd';
import Header from './header';
import './index.scss'; // 用于内容区域样式

const { Content } = AntLayout;

const Layout: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);

    // 滚动事件处理函数
    useEffect(() => {
        const handleScroll = () => {
            // 获取页面垂直滚动距离
            const offset = window.scrollY;
            // 当滚动超过80px时，改变状态
            if (offset > 80) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        // 添加滚动监听
        window.addEventListener('scroll', handleScroll);

        // 组件卸载时移除监听，防止内存泄漏
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []); // 空依赖数组，确保只运行一次

    return (
        <AntLayout className="layout">
            {/* 将滚动状态传递给 Header */}
            <Header scrolled={scrolled} />
        </AntLayout>
    );
};

export default Layout;
