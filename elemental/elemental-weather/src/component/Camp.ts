import Weather from "/@/weather/weather.ts";

export default class Camp {
    constructor() {
        this.weather = Weather.getInstance();
        this.scene = this.weather.scene;
        this.resources = this.weather.resources;
        this.addCamp();
    }

    addCamp() {
        this.campModel = this.resources.items.campModel.scene;
        this.scene.add(this.campModel);

        this.campModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}
