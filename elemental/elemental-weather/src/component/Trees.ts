import Weather from "/@/weather/weather.ts";

export default class Trees {
    constructor() {
        this.weather = Weather.getInstance();
        this.scene = this.weather.scene;
        this.resources = this.weather.resources;
        this.debugGUI = this.weather.debug;

        this.addTrees();
    }

    addTrees() {
        this.treeModel = this.resources.items.TreeTrunksModel.scene;
        this.scene.add(this.treeModel);

        this.treeModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}
