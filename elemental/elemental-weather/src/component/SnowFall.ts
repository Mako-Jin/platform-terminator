import SnowSystem from './SnowSystem';
import SeasonManager from "/@/utils/SeasonManager.ts";
import Weather from "/@/weather/weather.ts";

export default class SnowFall {
    constructor() {
        this.weather = Weather.getInstance();
        this.seasonManager = SeasonManager.getInstance();

        const snowBounds = {
            yMin: 15.0,
            yMax: 20.0,
            xRange: 40.0,
            zRange: 30.0,
            originX: 0.0,
            originZ: 0.0,
        };

        this.snowSystem = new SnowSystem(snowBounds);

        this.seasonManager.onChange((newSeason, oldSeason) => {
            this.onSeasonChanged(newSeason, oldSeason);
        });

        this.updateVisibility();
    }

    onSeasonChanged(newSeason, oldSeason) {
        this.updateVisibility();
    }

    updateVisibility() {
        const isWinterSeason = this.seasonManager.currentSeason === 'winter';
        this.snowSystem.setVisible(isWinterSeason);
    }

    update(delta, elapsedTime) {
        this.snowSystem.update(delta, elapsedTime);
    }
}
