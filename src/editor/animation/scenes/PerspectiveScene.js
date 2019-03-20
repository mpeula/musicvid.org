import * as THREE from 'three';
import Scene from './Scene'

export default class Scene3DPerspective extends Scene {
    constructor(gui, resolution, remove, moveScene) {
        super(gui, resolution, remove, moveScene);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, resolution.width / resolution.height, 0.1, 10000 );
        this.camera.position.z = 200;
      
        this.MODAL_REF_NR = 7;
        this.TYPE = "perspective";
        //this.folder.name = this.TYPE + " scene";
        this.setUpControls();
    }
}