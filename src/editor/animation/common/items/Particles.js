import * as THREE from 'three';
import ImpactAnalyser from '../../../audio/ImpactAnalyser'
import BaseItem from './BaseItem'
 

const vertShader =
    `attribute float size;
    attribute float alpha;
    uniform vec3 color; 
    varying float vAlpha; 
    varying vec3 vColor; 
    void main() { 
        vColor = color; 
        vAlpha = alpha; 
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); 
        gl_PointSize = 100.0 * size / length(mvPosition.xyz); 
        gl_Position = projectionMatrix * mvPosition; 
    }`;

const fragShader =
    `uniform sampler2D texture; 
    varying float vAlpha; 
    varying vec3 vColor; 
    void main() { 
        gl_FragColor = vec4(vColor, vAlpha); 
        gl_FragColor = gl_FragColor * texture2D(texture, gl_PointCoord); 
    }`;


class ParticleData {
    constructor(trajectory, speed, phaseAmp, phaseSpeed) {
        this.trajectory = trajectory; // the unit vector representing the trajectory of the particle
        this.speed = speed; // the speed multiplier of the particle
        this.phaseAmp = phaseAmp; // the amplitude of the particle's phase
        this.phaseSpeed = phaseSpeed; // the speed of the particle's phase
        this.phase = new THREE.Vector2(); // the current phase of the particle
    }

    getTrajectory = () => this.trajectory;
    getSpeed = () => this.speed;
    getPhaseAmplitude = () => this.phaseAmp;
    getPhaseSpeed = () => this.phaseSpeed;
    getPhase = () => this.phase;
    augmentPhase = (stepX, stepY) => {
        this.phase.x = (this.phase.x + stepX) % 1;
        this.phase.y = (this.phase.y + stepY) % 1;
    }
}

export default class Particles extends BaseItem {
    constructor(info) {
        super();
        this.maxParticleCount = 1200; // particle count at 1080p
        this.particleMaxSpawnRate = 8; // max particles to spawn each frame. this takes effect during particle initlzn.
        this.particleOpacityMin = 0.9;
        this.particleOpacityMax = 1;
        this.particleSizeMin = 8;
        this.particleSizeMax = 13;
        this.cameraZPlane = 200; // the z-plane on which to place the camera
        this.particleDespawnBuffer = 0; // distance from the camera z-plane before despawning particles
        this.particleRadiusMin = 10; // the minimum radius of the particle cone at the z-plane intersecting the camera
        this.particleRadiusMax = 120; // the maximum radius of the particle cone at the z-plane intersecting the camera
        this.particleBaseSpeed = 0.15;
        this.particleSpeedMultMin = 1.1;
        this.particleSpeedMultMax = 1.45;
        // The min/max phase speed a particle may be assigned. This is a property of each particle and does not change.
        this.particlePhaseSpeedMin = 0.1;
        this.particlePhaseSpeedMax = 0.25;
        // The min/max phase amplitude a particle may be assigned. This is a property of each particle and does not change.
        this.particlePhaseAmplitudeMin = 0.05;
        this.particlePhaseAmplitudeMax = 0.4;
        // The min/max to normalize the particle phase speed multiplier to.
        this.particlePhaseSpeedMultMin = 0.025;
        this.particlePhaseSpeedMultMax = 0.4;
        // The min/max to normalize the particle phase amplitude multiplier to.
        this.particlePhaseAmplitudeMultMin = 0.1;
        this.particlePhaseAmplitudeMultMax = 1;
        this.sizeMult = 1.0;
        this.VERTEX_SIZE = 3;
        this.scene = info.scene;
        this.particleData = [];
        this.baseSizes = [];
        this.color = 0xFFFFFF;
        this.baseSpeed = 1.0;
        this.folder = this.setUpGUI(info.gui, "Particles");
        
       

        this.impactAnalyser = new ImpactAnalyser(this.folder); 
        this.impactAnalyser.amplitude = 2.5;
        this.impactAnalyser.endBin = 80;
        this.impactAnalyser.deltaDecay = 0.3;
        this.folder.updateDisplay();
        this.setUp();
    }

    setUpGUI = (gui, name) => {
        const folder = gui.addFolder(name);
        folder.add(this, "maxParticleCount", 0, 5000).onChange(() => this.initializeParticles())
        folder.addColor(this, "color").onChange(this.changeColor);
        folder.add(this, "particleBaseSpeed", 0, 10, 0.01);
        folder.add(this, "sizeMult", 0, 5.0, 0.01).onChange(() => this.updateSizes());

        return folder;
    }

    changeColor = () => {

        this.pMaterial.uniforms.color.value = new THREE.Color(this.color)
    }


    setUp = ()  => {
        this.particlesGeom = new THREE.BufferGeometry();
        let texLoader = new THREE.TextureLoader();
        texLoader.crossOrigin = "";

        const texLoc = "./img/particle.png";
        

        const particleTexture = texLoader.load(texLoc);
        particleTexture.minFilter = THREE.LinearFilter;

        let uniforms = {
            color: { type: "c", value: new THREE.Color(0xFFFFFF)},
            texture: { type: "t", value: particleTexture }
        };

        this.pMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertShader,
            fragmentShader: fragShader,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthTest: false
        });

        
        this.initializeParticles();
        this.scene.add(this.particleSystem);
    }

    update = function(time, audioData) {
        if(this.particleSystem) {
            const multiplier = this.impactAnalyser.analyse(audioData.frequencyData);
            for (let i = 0; i < this.maxParticleCount / 2; i++) {

                this.updatePosition(i, multiplier);
             }
     
             this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }
       
    }

    updatePosition = function(i, multiplier, ignoreSpeed) {
        let data = this.particleData[i];

        if (data === undefined) {
            return; // no data set, so particle is "despawned"
        }

        let speed = ignoreSpeed ? 1 * this.baseSpeed : data.getSpeed() * this.baseSpeed;
        const adjustedSpeed = Math.max(speed * multiplier * this.baseSpeed, this.particleBaseSpeed);

        let ampMult = (this.particlePhaseAmplitudeMultMax - this.particlePhaseAmplitudeMultMin) * multiplier
                + this.particlePhaseAmplitudeMultMin;
        let phaseX = Math.sin(Math.PI * 2 * data.getPhase().x) * data.getPhaseAmplitude().x * ampMult;
        let phaseY = Math.sin(Math.PI * 2 * data.getPhase().y) * data.getPhaseAmplitude().y * ampMult;

        let baseIndex = this.VERTEX_SIZE * i;
        let x = this.particlesGeom.attributes.position.array[baseIndex + 0]
                + data.getTrajectory().x * adjustedSpeed
                + phaseX;
        let y = this.particlesGeom.attributes.position.array[baseIndex + 1]
                + data.getTrajectory().y * adjustedSpeed
                + phaseY;
        let z = this.particlesGeom.attributes.position.array[baseIndex + 2] + adjustedSpeed;

        if (z + this.particleDespawnBuffer > this.cameraZPlane) {
            this.despawnParticle(i);
        } else {
            this.applyPosition(i, x, y, z);
        }

        let speedMult = (this.particlePhaseSpeedMultMax - this.particlePhaseSpeedMultMin) * multiplier
                + this.particlePhaseSpeedMultMin;
        data.augmentPhase(
            data.getPhaseSpeed().x * speedMult,
            data.getPhaseSpeed().y * speedMult
        );
    }

    random = (min, max) => {
        return Math.random() * (max - min) + min;
    }

    initializeParticles = ()  => {
        this.particleData = [];
        this.baseSizes = [];
        this.baseSizes = [];

        this.maxParticleCount = Math.floor(this.maxParticleCount) + Math.floor(this.maxParticleCount) % 2;
        console.log(this.maxParticleCount)

        this.particleSystem = new THREE.Points(this.particlesGeom, this.pMaterial);
        this.particleSystem.sortParticles = true;
        this.particleSystem.geometry.dynamic = true;


        let posArr = new Float32Array(this.maxParticleCount * this.VERTEX_SIZE);
        let sizeArr = new Float32Array(this.maxParticleCount);
        let alphaArr = new Float32Array(this.maxParticleCount);

        this.particleSystem.geometry.addAttribute("position", new THREE.BufferAttribute(posArr, 3));
        this.particleSystem.geometry.addAttribute("size", new THREE.BufferAttribute(sizeArr, 1));

        for (let i = 0; i < this.maxParticleCount / 2; i++) {
            this.applyPosition(i, 0, 0, 0);
            this.baseSizes[i] = this.random(this.particleSizeMin, this.particleSizeMax);
            this.applyMirroredValue(alphaArr, i, Math.random(this.particleOpacityMin, this.particleOpacityMax));

            this.resetVelocity(i);
        }

        this.updateSizes();

        this.particleSystem.geometry.addAttribute("alpha", new THREE.BufferAttribute(alphaArr, 1));

        for (let i = 0; i < this.maxParticleCount / 2; i++) {
            this.updatePosition(i, Math.random() * this.cameraZPlane, true);
        }
    }

    spawnParticle = (i) => {
        this.resetVelocity(i); // attach a new speed to the particle, effectively "spawning" it
    }

    despawnParticle = (i) => {
        // we can't technically despawn a discrete particle since it's part of a
        // particle system, so we just reset the position and pretend
        this.resetPosition(i);
        this.particleData[i] = undefined; // clear the data so other functions know this particle is "despawned"
        this.resetVelocity(i);
    }

    resetPosition = (i) => {
        this.applyPosition(i, 0, 0, 0);
    }

    resetVelocity = (i) => {
        let r = this.random(this.particleRadiusMin, this.particleRadiusMax);
        let theta = Math.PI * Math.random() - Math.PI / 2;
        let trajectory = new THREE.Vector2(
            r * Math.cos(theta) / this.cameraZPlane,
            r * Math.sin(theta) / this.cameraZPlane
        );
        
        let speed = this.random(this.particleSpeedMultMin, this.particleSpeedMultMax);

        let phaseAmp = new THREE.Vector2(
            this.random(this.particlePhaseAmplitudeMin, this.particlePhaseAmplitudeMax),
            this.random(this.particlePhaseAmplitudeMin, this.particlePhaseAmplitudeMax)
        );

        let phaseSpeed = new THREE.Vector2(
            this.random(this.particlePhaseSpeedMin, this.particlePhaseSpeedMax),
            this.random(this.particlePhaseSpeedMin, this.particlePhaseSpeedMax)
        );

        this.particleData[i] = new ParticleData(trajectory, speed, phaseAmp, phaseSpeed);
    }

    updateSizes = () => {
        for (let i = 0; i < this.maxParticleCount / 2; i++) {
            this.applyMirroredValue(this.particlesGeom.attributes.size.array, i, this.baseSizes[i] * this.sizeMult);
        }
        this.particlesGeom.attributes.size.needsUpdate = true;
    }

     applyPosition = (i, x, y, z) => {
        let baseIndex = this.VERTEX_SIZE * i;
        this.applyMirroredValue(this.particlesGeom.attributes.position.array, baseIndex + 0, x, this.VERTEX_SIZE);
        this.applyMirroredValue(this.particlesGeom.attributes.position.array, baseIndex + 1, y, this.VERTEX_SIZE);
        this.applyMirroredValue(this.particlesGeom.attributes.position.array, baseIndex + 2, z, this.VERTEX_SIZE);
        this.particlesGeom.attributes.position.array[baseIndex + this.maxParticleCount * (3 / 2)] *= -1;
    }

    applyMirroredValue = (array, i, value, step = 1) => {
        array[i] = value;
        array[i + step * this.maxParticleCount / 2] = value;
    }

}
