import RainSystem from './RainSystem';
import SeasonManager from "/@/utils/SeasonManager.ts";
import Weather from "/@/weather/weather.ts";

export default class Rain {
    constructor() {
        this.weather = Weather.getInstance();
        this.seasonManager = SeasonManager.getInstance();

        const rainBounds = {
            yMin: 15.0,
            yMax: 20.0,
            xRange: 40.0,
            zRange: 40.0,
            originX: 0.0,
            originZ: 0.0,
        };

        this.rainSystem = new RainSystem(rainBounds);

        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });

        this.updateVisibility();
    }

    onSeasonChanged(newSeason, oldSeason) {
        this.updateVisibility();
    }

    updateVisibility() {
        const isRainySeason = this.seasonManager.currentSeason === 'rainy';
        this.rainSystem.setVisible(isRainySeason);
    }

    update(delta, elapsedTime) {
        this.rainSystem.update(delta, elapsedTime);
    }
}
