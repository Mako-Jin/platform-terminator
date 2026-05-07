import { useEffect, useState } from 'react';

interface HamburgerMenuProps {
  onOpenSettings: () => void;
}

const HamburgerMenu: ({onOpenSettings}: { onOpenSettings: any }) => (null | JSX.Element) = ({ onOpenSettings }) => {
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
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      id="hamburger-menu"
      className="show"
      title="Settings"
      onClick={handleClick}
    >
      <i className="fas fa-bars"/>
    </button>
  );
};

export default HamburgerMenu;
