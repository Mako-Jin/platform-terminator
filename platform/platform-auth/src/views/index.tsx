import Login from "./login";
import Loading from "./login/loading";
import {useState} from "react";

const AuthIndex = () => {

    const [showLoading, setShowLoading] = useState(true);

    const handleLoadingComplete = () => {
        setShowLoading(false);
        // 这里可以加载您的主页面内容
        console.log('Loading完成，可以显示主界面了');
    };

    return (
        <div className="App">
            {showLoading && <Loading onLoadingComplete={handleLoadingComplete} duration={2500} />}
            {/* 这里放您的主页面内容 */}
            {!showLoading && (
                <div style={{
                    width: '100vw',
                    height: '100vh',
                    background: '#0a0a0a',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#d4af37'
                }}>
                    <h1>主页面内容</h1>
                </div>
            )}
        </div>
    );

}

export default AuthIndex;

