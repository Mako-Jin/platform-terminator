import {ResourceLoader} from "/@/resources";
import {LoggerFactory} from "common-shared";
import Clock from "/@/core/Clock";
import Sizes from "/@/core/Size";
import * as Three from "three";
import Camera from "/@/core/Camera";
import Renderer from "/@/core/Renderer";
import World from "./world";

class Weather {

    private static instance: Weather;

    private Logger = LoggerFactory.create("weather");
    private isDebugMode: boolean;
    private resources: ResourceLoader;
    private container: HTMLElement;
    private clock: Clock;
    private sizes: Sizes;
    private scene: Three.Scene;
    private camera: Camera;
    private renderer: Renderer;
    private world: World;

    constructor() {
        if (Weather.instance) {
            return Weather.instance;
        }
        Weather.instance = this;
    }

    static getInstance() {
        if (!Weather.instance) {
            Weather.instance = new Weather();
        }
        return Weather.instance;
    }

    public init(
        container: HTMLElement,
        resources: ResourceLoader,
        isDebugMode: boolean = false
    ) {
        this.isDebugMode = isDebugMode;
        this.container = container;
        this.resources = resources;
        this.clock = new Clock();
        this.sizes = new Sizes();

        this.scene = new Three.Scene();
        this.camera = new Camera(this.container, this.sizes, this.scene);
        this.renderer = new Renderer(this.container, this.sizes, this.scene, this.camera, this.renderer, isDebugMode);

        this.world = new World(this.scene, this.renderer);

        this.clock.on('animate', () => {
            this.update();
        });
        this.sizes.on('resize', () => {
            this.resize();
        });
    }

    public start() {

    }

    resize() {
        this.camera.resize();
        this.renderer.resize();
    }

    update() {
        this.camera.update();
        this.world.update(this.clock.getDelta(), this.clock.getElapsedTime());
        this.renderer.update();
    }

}

export default Weather;
