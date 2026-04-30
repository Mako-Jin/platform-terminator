

export default class SeasonManager {

    private static instance: SeasonManager;

    private currentSeason: string;

    private availableSeasons: string[];

    constructor(initialSeason = 'spring') {
        if (SeasonManager.instance) {
            return SeasonManager.instance;
        }
        SeasonManager.instance = this;

        this.currentSeason = initialSeason;

        this.availableSeasons = ['spring', 'winter', 'autumn', 'rainy'];

    }

}
