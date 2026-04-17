// views/portal/index.tsx (简单的门户页面)
import React from 'react';
import { useAuth } from '/@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
// import './index.module.scss';
import styles from './index.module.scss';

const PortalPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className={styles.portalContainer}>
            {/* 背景装饰 */}
            <div className={styles.background}/>

            {/* 主内容区 */}
            <div className={styles.content}>
                <div className={styles.header}>
                    <div className={styles.title}>⚜️ 乾 坤 代 理 · 灵 境 门 户 ⚜️</div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        离 境
                    </button>
                </div>

                <div className={styles.welcomeCard}>
                    <div className={styles.welcomeIcon}>🏮</div>
                    <div className={styles.welcomeText}>
                        欢迎归来，<span className={styles.username}>{user?.username}</span>
                    </div>
                    <div className={styles.divider}/>
                    <div className={styles.description}>
                        <p>⚡ 乾坤代理门户已开启 ⚡</p>
                        <p>灵境科技 · 古韵天工</p>
                        <p>更多功能正在建设中...</p>
                    </div>
                    <div className={styles.seal}>入 境 灵 钥</div>
                </div>

                <div className={styles.footer}>
                    <span>© 2025 灵境科技 · 乾坤代理</span>
                </div>
            </div>
        </div>
    );
};

export default PortalPage;
