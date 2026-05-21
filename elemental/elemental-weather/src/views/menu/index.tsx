import {type JSX, useEffect, useState} from 'react';

import "./index.scss";

interface HamburgerMenuProps {
    onOpenSettings: () => void;
}

const HamburgerMenu: ({onOpenSettings}: HamburgerMenuProps) => (null | JSX.Element) = ({ onOpenSettings }) => {
    const [isVisible, setIsVisible] = useState(false);

    const handleClick = () => {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
        onOpenSettings();
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <button
            className="hamburger-menu show"
            title="Settings"
            onClick={handleClick}
        >
            <i className="fas fa-bars"/>
        </button>
    );
};

export default HamburgerMenu;
