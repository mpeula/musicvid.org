
import getItemClassFromText from '../items'
import OrbitControls from '../controls/OrbitControls';

export default class Scene {
    constructor(gui, resolution, remove, moveScene) {
        this.__moveScene = moveScene;
        this.remove = remove;   
        this.resolution = resolution;  
        this.isScene = true;   

        this.items = [];
        if(gui) {
            this.modalRef = gui.modalRef;
            this.gui = gui;
            this.setUpGui();
        }
    }


    addItems = (items) => {
        items.forEach(item => {
            const i = this.addItemFromText(item.__itemName);
            i.__setControllerValues(item.controllers);
            i.__automations = item.__automations;
            i.setFolderName(i.name);
        })
    }

    updateCamera = () => {
        
        const enabled = this.controls.enabled;
        this.controls.dispose();
        this.controls = new OrbitControls(this.camera, this.gui.__root.canvasMountRef);
        this.controls.handleMouseUp = this.handleMouseUp;
        this.controls.enabled = enabled;
    }

    resetCamera =  () => {
        this.controls.reset();
        this.cameraFolder.updateDisplay();
    }

    updateSettings = () => {

    }

    undoCameraMovement = (matrix) => {
        const { camera } = this;
       
        camera.matrix.fromArray(matrix);
        camera.matrix.decompose(camera.position, camera.quaternion, camera.scale); 
        this.lastCameraArray = this.camera.matrix.toArray();
        this.cameraFolder.updateDisplay();
    }


    handleMouseUp = () => {
        this.gui.getRoot().addUndoItem({type: "action", func: this.undoCameraMovement, args: this.lastCameraArray});
        this.lastCameraArray = this.camera.matrix.toArray();
        this.cameraFolder.updateDisplay();
    }

    updateCameraMatrix = () => {
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();

        if(this.controls.enabled) {
            this.controls.update();
        }
    }
    
    setUpControls = () => {
        this.controls = new OrbitControls(this.camera, this.gui.__root.canvasMountRef);
        this.controls.enabled = false;
        this.cameraFolder.add(this.controls, "enabled").name("Orbitcontrols enabled");
        this.controls.handleMouseUp = this.handleMouseUp;
        this.lastCameraArray = this.camera.matrix.toArray();

        this.cameraXController = this.cameraFolder.add(this.camera.position, "x", -10, 10, 0.001).name("positionX").onChange(this.updateCameraMatrix);
        this.cameraYController = this.cameraFolder.add(this.camera.position, "y", -10, 10, 0.001).name("positionY").onChange(this.updateCameraMatrix);
        this.cameraZController = this.cameraFolder.add(this.camera.position, "z", -10, 10, 0.001).name("positionZ").onChange(this.updateCameraMatrix);

        this.cameraFolder.add(this.camera.rotation, "x", -Math.PI, Math.PI, 0.0001).name("rotationX").onChange(this.updateCameraMatrix);
        this.cameraFolder.add(this.camera.rotation, "y", -Math.PI, Math.PI, 0.0001).name("rotationY").onChange(this.updateCameraMatrix);
        this.cameraFolder.add(this.camera.rotation, "z", -Math.PI, Math.PI, 0.0001).name("rotationZ").onChange(this.updateCameraMatrix);
        this.cameraFolder.add(this.camera, "zoom", -10, 10, 0.001).onChange(this.updateCameraMatrix);
    }

    setUpPassConfigs = () => {
        this.settingsFolder.add(this.pass, "clear");
        this.settingsFolder.add(this.pass, "clearDepth");
        this.settingsFolder.add(this.pass, "needsSwap");
    }

    setUpGui = (before =  null) => {
        const gui = this.gui;
        this.folder = gui.addFolder(this.TYPE  + " scene", true, true, before);
        this.folder.upFunction = () => this.__moveScene({up: true, scene: this});
        this.folder.downFunction = () => this.__moveScene({up: false, scene: this});
        this.itemsFolder = this.folder.addFolder("Items");
        
        this.itemsFolder.add(this, "addItem");
        this.cameraFolder = this.folder.addFolder("Camera");
        this.settingsFolder = this.folder.addFolder("Settings");
        this.cameraFolder.add(this, "resetCamera");
        this.settingsFolder.add(this, "removeMe").name("Remove this scene");
        
        //this.itemsFolder.title.style.backgroundColor = "#090909";
        //this.cameraFolder.title.style.backgroundColor = "#090909";
        //this.settingsFolder.title.style.backgroundColor = "#090909";

        this.items.forEach(item =>  {
            item.__gui = this.itemsFolder;
            item.__setUpFolder();
        })
    }

    removeMe = () => {
        // TODO fix better handling of removing scenes regarding undo/redo
        /*
        while(this.items.length > 0) {
            this.items[0].dispose();
            if(this.TYPE !== "canvas")
                this.scene.remove(this.items[0].mesh);
            this.items.pop();
        }*/

        this.remove({scene: this});
    }

    removeItem = (args) => {
        const {item, undoAction} = args;

        const index = this.items.findIndex(e => e === item);
        if(this.TYPE !== "canvas")
            this.scene.remove(this.items[index].mesh);

        item.folder.parent.removeFolder(item.folder);
        this.items.splice(index, 1);
        if(!undoAction) {
            const it = {func: this.undoRemoveItem, args: { item, undoAction: true}, type: "action"}
            this.folder.getRoot().addUndoItem(it);
        }

    }

    undoRemoveItem = (args) => {
        const {item} = args;
        this.items.push(item);

        item.setUpFolder();
        if(this.TYPE !== "canvas")
            this.scene.add(item.mesh);
    }

    stop = () => {
        this.items.forEach(item => {
            item.stop();
        })
    }

    getInfoObject = () => {
        if(this.TYPE === "canvas") {
            
        }
    }

    addItemFromText = (name, fromTemplate=true) => {
        if(name) {
            let info = {
                gui: this.itemsFolder,
                type: this.TYPE,
                width: this.resolution.width,
                height: this.resolution.height,
                scene: this.scene,
                camera: this.camera,
                remove: this.removeItem
            };

            if(this.TYPE  === "canvas") {
                info = {...info, ctx: this.ctx, canvas: this.canvas};
            }
            
            const itemClass = getItemClassFromText(this.TYPE, name);
            const item = new itemClass(info);
            item.__itemName = name;
            this.items.push(item);

            if(!fromTemplate) {
                const it = {func: this.removeItem, args: { item, undoAction: true} , type: "action"}
                this.folder.getRoot().addUndoItem(it);
            }
          
            return item;
        }
    }


    addItem = () => {
        const ref = this.itemsFolder.__root.modalRef;
        ref.toggleModal(this.MODAL_REF_NR).then((text) => this.addItemFromText(text, false));
    }

    update = (time, audioData, shouldIncrement) => {
        if(shouldIncrement) {
            this.items.forEach(item =>  {
                item.mesh.visible = (item.__startTime <= time && item.__endTime >= time);
                item.applyAutomations();
                item.update(time, audioData)  
            });
        }
    }
}