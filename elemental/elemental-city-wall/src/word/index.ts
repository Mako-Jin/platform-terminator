import {LoggerFactory} from "common-tools";
import type {QiankunConfig} from "/@/settings";


interface WorldConfig {
    container: HTMLElement;
    isDebugMode?: boolean;
    onInitProgress?: (progress: number) => void;
    qiankunConfig?: QiankunConfig;
}



class World {

    private logger = LoggerFactory.create("elemental-city-wall-world");

    private static instance: World;

    constructor() {
        if (World.instance) {
            return World.instance;
        }
        World.instance = this;
    }

    static getInstance() {
        if (!World.instance) {
            World.instance = new World();
        }
        return World.instance;
    }

    init(config: WorldConfig) {

    }

    start() {

    }

    dispose() {

    }

    update() {

    }

}

export default World;
