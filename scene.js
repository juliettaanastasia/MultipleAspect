import * as THREE from './js/three.module.js';
import {OrbitControls} from './js/OrbitControls.js';
import {GLTFLoader} from './js/GLTFLoader.js';
import { GUI } from "https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js";

//canvas
const canvas = document.querySelector('canvas.webgl')

//scene
const scene = new THREE.Scene();

//size
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    //update size
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    //update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    //update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

})

// Camera

const camera = new THREE.PerspectiveCamera(100, sizes.width / sizes.height, 0.1, 100);
camera.position.x = 0;
camera.position.y = 10;
camera.position.z = 70;
scene.add(camera);

//controls
const controls = new OrbitControls(camera, canvas);
controls.autoRotate = true;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.screenSpacePanning = false;

// Controls
const gui = new GUI();
gui.add(controls, "autoRotate").name("controls.autoRotate").listen();
gui.add(controls, "enableDamping").name("controls.enableDamping").listen();
gui.add(controls, "dampingFactor", 0, 0.1).name("controls.dampingFactor");

//Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
    //alpha: true,
    //antialias: true,
})

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.render(scene, camera, controls);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

//panorama
const loader1 = new THREE.TextureLoader();
const texture= loader1.load(
  "https://threejsfundamentals.org/threejs/resources/images/equirectangularmaps/tears_of_steel_bridge_2k.jpg",
  () => {
    const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
    rt.fromEquirectangularTexture(renderer, texture);
    scene.background = rt.texture;
  }
);

//object plane
const loader4 = new THREE.TextureLoader();
const sand = loader4.load("https://images.unsplash.com/photo-1514477917009-389c76a86b68?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1967&q=80");
sand.wrapS = THREE.RepeatWrapping;
sand.wrapT = THREE.RepeatWrapping;
const repeats = 1;
sand.repeat.set(repeats, repeats);

let sandPlane = new THREE.BoxGeometry(35, 35);
let sandMaterial = new THREE.MeshLambertMaterial({
  map:sand

});

let plane = new THREE.Mesh(sandPlane,sandMaterial);
plane.rotation.x = Math.PI / 2;
plane.position.y = -8.5;
plane.receiveShadow = true;
scene.add(plane);

//scenegraph
function dumpObject(obj, lines = [], isLast = true, prefix = '') {
    const localPrefix = isLast ? '└─' : '├─';
    lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
    const newPrefix = prefix + (isLast ? '  ' : '│ ');
    const lastNdx = obj.children.length - 1;
    obj.children.forEach((child, ndx) => {
        const isLast = ndx === lastNdx;
        dumpObject(child, lines, isLast, newPrefix);
    });
    return lines;
}

//object gltf
const loader2 = new GLTFLoader()
loader2.load('./assets/scene.gltf', function(gltf){
       gltf.scene.scale.set(8, 8, 8);
        const root = gltf.scene;
        root.position.x = 0;
        root.position.y = -7;
        root.position.z = 5;
        scene.add(root);
    
        root.traverse(n => { if ( n.isMesh ) {
          n.castShadow = true; 
          n.receiveShadow = true;
        }});

})

//Light
const ambientLight = new THREE.AmbientLight(0x000000);
scene.add(ambientLight);

const solarLight = new THREE.DirectionalLight();
solarLight.position.set(500, 500, -500);
solarLight.castShadow = true;
solarLight.intensity = 2;
solarLight.shadow.mapSize.width = 1024;
solarLight.shadow.mapSize.height = 1024;
solarLight.shadow.camera.near = 250;
solarLight.shadow.camera.far = 1000;

let intensity = 60;

solarLight.shadow.camera.left = -intensity;
solarLight.shadow.camera.right = intensity;
solarLight.shadow.camera.top = intensity;
solarLight.shadow.camera.bottom  = -intensity;
scene.add(solarLight);

// directional light
const directionalLightFolder = gui.addFolder('Directional Light');
directionalLightFolder.add(solarLight, 'visible');
directionalLightFolder.add(solarLight.position, 'x').min(-500).max(500).step(10);
directionalLightFolder.add(solarLight.position, 'y').min(-500).max(500).step(10);
directionalLightFolder.add(solarLight.position, 'z').min(-500).max(500).step(10);
directionalLightFolder.add(solarLight, 'intensity').min(0).max(10).step(0.1);

//Add fog
const color = 0xffffff;
const near = 30;
const far = 100;
scene.fog = new THREE.Fog(color, near, far);

camera.position.set(-10, 10, -25);

//reflective sphere
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { 
  format: THREE.RGBFormat, 
  generateMipmaps: true, 
  minFilter: THREE.LinearMipmapLinearFilter,
});

let sphereCamera = new THREE.CubeCamera(1,1000,cubeRenderTarget);
sphereCamera.position.set(1, 0, -1);
scene.add(sphereCamera);

const sphereMirror = new THREE.MeshBasicMaterial({
  envMap: sphereCamera.renderTarget.texture,
});

const sphereGeo = new THREE.SphereGeometry(4, 32, 16);
const mirrorBall = new THREE.Mesh( sphereGeo, sphereMirror);
mirrorBall.position.set(2, 13, -6);
scene.add(mirrorBall);

const animate = () =>
{
    controls.update();

    //render
    sphereCamera.update(renderer, scene);
    renderer.render(scene, camera);

    window.requestAnimationFrame(animate);
}
animate();