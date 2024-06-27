<script>
  import * as THREE from "@build/three.module";
  import { onMount, tick } from "svelte";
  import { GLTFLoader } from "@js/GLTFLoader";
  import { OrbitControls } from "@js/OrbitControls";
  import { sRGBEncoding } from "@build/three.module";
  import { EffectComposer } from "@js/post-processing/EffectComposer";
  import { EXRLoader } from "@js/EXRLoader";
  import { environments } from "@public/assets/environment/index";
  import { RoomEnvironment } from "@js/RoomEnvironment";
  import { RenderPass } from "@js/post-processing/RenderPass";
  import { ShaderPass } from "@js/post-processing/ShaderPass";
  import { OutlinePass } from "@js/post-processing/OutlinePass";
  import { OutputPass } from "@js/post-processing/OutputPass";
  import { FXAAShader } from "@js/post-processing/FXAAShader";
  import { GammaCorrectionShader } from "@js/shaders/GammaCorrectionShader";
  import { GTAOPass } from "@js/post-processing/GTAOPass";
  import { ReflectorForSSRPass } from "@js/post-processing/ReflectorForSSRPass";

  let controls;
  let canvas;
  let loader;
  let scene;
  let camera;
  let clock;
  let composer, effectFXAA, outlinePass;
  let renderer;
  let pmremGenerator;
  let neutralEnvironment;
  let cubeRenderTarget;
  let cubeCamera;
  let mobihome;
  const ssrParams = {
    enableSSR: true,
    autoRotate: true,
    otherMeshes: true,
    groundReflector: true,
  };
  let ssrPass;
  const otherMeshes = [];
  const widthScreen = window.innerWidth;
  const heightScreen = window.innerHeight;
  const outSideVanElement = [
    "Color_M00168",
    "Color_M00158",
    "Color_M00136",
    "Color_M00181",
    "Color_M00197",
    "Default_150150150008",
    "Color_M00210",
    "Color_M00173",
    "Color_M00176",
    "Color_M00127",
    "Color_M00426",
    "Default_150150150004",
    "Color_M00169",
    "Color_M00170",
    "Color_M00149",
    "Color_M00135",
    "Color_M00426",
    "Color_M00381",
  ];
  const noSelectSSR = [
    "Color_M00185",
    "Color_M00264",
    "Color_M00066",
    "Color_M00269",
    "Color_M00265",
  ];
  const SHADOW_MAP_WIDTH = 2048,
    SHADOW_MAP_HEIGHT = 1024;

  const init = () => {
    camera = new THREE.PerspectiveCamera(
      60,
      widthScreen / heightScreen,
      0.01,
      1000
    );
    camera.position.set(-2.5, 1.25, 2.25);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);
    clock = new THREE.Clock();

    scene.add(camera);

    const light1 = new THREE.AmbientLight(0xffffff, 0.5);
    light1.name = "ambient_light";
    scene.add(light1);

    const light = new THREE.DirectionalLight(0xffffff, 0.8 * Math.PI);
    light.castShadow = true;
    // light.shadow.bias = 0.0001;
    // light.position.set(0.5 * 2, 1 * 2, 0.866 * 2); // ~60º
    light.shadow.camera.top = 2000;
    light.shadow.camera.bottom = -2000;
    light.shadow.camera.left = -2000;
    light.shadow.camera.right = 2000;
    light.shadow.camera.near = 1200;
    light.shadow.camera.far = 2500;
    light.shadow.bias = 0.0001;

    light.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    light.shadow.mapSize.height = SHADOW_MAP_HEIGHT;
    scene.add(light);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = sRGBEncoding;
    renderer.setClearColor(0xcccccc);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setSize(widthScreen, heightScreen);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = true;
    // controls.maxPolarAngle = 1.0;
    // controls.minPolarAngle = -0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.5;

    //post-processing
    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    loader = new GLTFLoader();

    //Body of Engine
    loader.load(
      "./models/van/van.glb",
      function (gltf) {
        mobihome = gltf.scene;
        mobihome.scale.set(10, 10, 10);

        scene.add(mobihome);

        gltf.scene.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
      },
      undefined,
      function (error) {
        console.error(error);
      }
    );
  };

  const onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    composer.setSize(width, height);
    renderer.setSize(width, height);
  };

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();

    // renderer.render(scene, camera);
    composer.render(scene, camera);
  };

  onMount(() => {
    init();
    animate();

    window.addEventListener("resize", onWindowResize);
  });
</script>

<main>
  <canvas class="full-screen" id="container" bind:this={canvas}> hihi </canvas>
</main>

<style>
  .full-screen {
    margin: 0 !important;
    padding: 0 !important;
  }
</style>
