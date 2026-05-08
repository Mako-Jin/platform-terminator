export const Haptics = {
  buttonTap(): void {
    if ('haptic' in navigator) {
      (navigator as any).haptic([{ intensity: 0.7, sharpness: 0.1 }]);
    } else if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  thunder(): void {
    if ('haptic' in navigator) {
      (navigator as any).haptic('error');
    } else if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 100, 50, 200]);
    }
  },
};
