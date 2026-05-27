import type { SceneWrapper } from "common-three";
import * as Three from 'three';


export default class Lighting {

    constructor(scene: SceneWrapper, options: { isDebugMode?: boolean } = {}) {
        const hemiLight = new Three.HemisphereLight( 0xffffff, 0x8d8d8d, 3 );
        hemiLight.position.set( 0, 20, 0 );
        scene.addObject( hemiLight );

        const dirLight = new Three.DirectionalLight( 0xffffff, 3 );
        dirLight.position.set( 0, 20, 10 );
        scene.addObject( dirLight );
    }

}
