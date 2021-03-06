
import * as THREE from "three";
import MeshItem from '../MeshItem'
import { addOrthoMeshControls }  from '../AddMeshControls'
import fonts from 'editor/animation/util/Fonts'



export default class SpriteText extends MeshItem {
    constructor(info) {
        super(info);
        this.name = "Sprite Text";
        this.canvas = document.createElement("canvas");
        this.textureResolutionWidth = 1024;
        this.textureResolutionHeight = 512;

        this.canvas.height  = this.textureResolutionHeight;
        this.canvas.width  = this.textureResolutionWidth;

        this.ctx = this.canvas.getContext("2d");

        this.fontSize = 30;
        this.font = "Montserrat";
        this.positionX  = 0;
        this.positionY  = 0;
        this.textureScale = 1.0;
        this.ctx.fillStyle = "#FFFFFF";
        this.aspect = info.width/info.height;
        this.text = "Example Text";
        this.ctx.textAlign = "center";
        this.textAlign ="center";
        
        // SHADOWS
        this.shouldDrawShadow = true;
        this.shadowBlur = 12;
        this.lineWidth = 5;
        this.shadowColor = "#000000";

        this.changeGeometry("Plane");
        this.changeMaterial("MeshBasicMaterial");
        
        this.tex = new THREE.CanvasTexture(this.canvas);
        this.material.map = this.tex;
        this.mat = new THREE.MeshBasicMaterial({transparent: true, map: this.tex})

        info.scene.remove(this.mesh);
        //this.mat = new THREE.MeshBasicMaterial({map:tex, transparent: true});
        this.geometry = new THREE.PlaneGeometry(2, this.aspect);
        this.mesh = new THREE.Mesh(this.geometry, this.mat);
        this.mesh.scale.set(this.textureScale, this.textureScale, this.textureScale)

        
        this.updateText();
        info.scene.add(this.mesh);

        this.ctx.fillStyle = "#FFFFFF";
        this.setUpFolder();
    }

    setText = (text, x, y, options) => {
        if(options.fontSize) this.fontSize = options.fontSize;
        if(options.textAlign) this.textAlign = options.textAlign;
        if(options.shadowBlur) this.shadowBlur = options.shadowBlur; 
        if(options.lineWidth) this.lineWidth = options.lineWidth; 

        this.text = text;
        this.positionX = x;
        this.mesh.position.x = this.positionX;
        this.positionY = y;
        this.mesh.position.y = this.positionY;
        this.updateText();
    }

    updateText = () => {
        const {width,height} = this.canvas;
        this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
        this.ctx.font = `normal ${this.fontSize}px ${this.font}`;
        this.ctx.textAlign = this.textAlign;
        this.tex.needsUpdate = true;
        this.ctx.fillText(this.text, width/2, height / 2)
    }

    setSize = () => {
        this.canvas.width = Number(this.textureResolutionWidth);
        this.canvas.height = Number(this.textureResolutionHeight);
        this.updateText();
    }

    __setUpGUI = (folder) => {
        this.addController(folder,this, "text").onChange(this.updateText);
        this.addController(folder,this, "font", fonts).onChange(this.updateText);
        this.addController(folder,this, "fontSize", 0, 300).onChange(this.updateText);
        this.addController(folder,this, "shouldDrawShadow");
        this.addController(folder,this, "shadowColor");
        this.addController(folder,this, "lineWidth", 0, 30);
        this.addController(folder,this.ctx, "fillStyle", {color: true});
        addOrthoMeshControls(this, this.mesh, folder);
        return this.__addFolder(folder);
    };

    update = (time, dt, data) => {  };
}


