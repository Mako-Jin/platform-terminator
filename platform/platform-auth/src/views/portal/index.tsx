// views/portal/index.tsx (简单的门户页面)
import React from 'react';
import { useAuth } from '/@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './index.scss';

const PortalPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="portalContainer">
            {/* 背景装饰 */}
            <div className="background"/>

            {/* 主内容区 */}
            <div className="content">
                <div className="header">
                    <div className="title">⚜️ 乾 坤 代 理 · 灵 境 门 户 ⚜️</div>
                    <button className="logoutBtn" onClick={handleLogout}>
                        离 境
                    </button>
                </div>

                <div className="welcomeCard">
                    <div className="welcomeIcon">🏮</div>
                    <div className="welcomeText">
                        欢迎归来，<span className="username">{user?.username}</span>
                    </div>
                    <div className="divider"/>
                    <div className="description">
                        <p>⚡ 乾坤代理门户已开启 ⚡</p>
                        <p>灵境科技 · 古韵天工</p>
                        <p>更多功能正在建设中...</p>
                    </div>
                    <div className="seal">入 境 灵 钥</div>
                </div>

                <div className="footer">
                    <span>© 2025 灵境科技 · 乾坤代理</span>
                </div>
            </div>
        </div>
    );
};

export default PortalPage;
