
import * as Three from 'three';
import ResourcesManager from "/@/resources/manager.ts";


export default class TreesTrunks {
    
    private scene: Three.Scene;
    private isDebugMode: boolean;
    private resourcesManager: ResourcesManager;
    private treeModel: Three.Group;
    
    constructor(scene: Three.Scene, isDebugMode: boolean = false) {
        this.scene = scene;
        this.isDebugMode = isDebugMode;

        this.resourcesManager = ResourcesManager.getInstance();
        
        this.addTrees();
    }

    addTrees() {
        const resource = this.resourcesManager.getItem("TreeTrunksModel");
        if (!resource || !resource.scene) {
            console.error('TreeTrunksModel resource not found or invalid');
            return;
        }
        
        this.treeModel = resource.scene;
        this.scene.add(this.treeModel);

        this.treeModel.traverse((child) => {
            if (child instanceof Three.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}
