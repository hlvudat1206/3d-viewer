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
  import { SSRPass } from "@js/post-processing/SSRPass";
  import { GUI } from "@js/lil-gui.module.min.js";

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
  let pmremCubeRenderTarget;
  let cubeCamera;
  let mobihome;
  let internalEnvMap;

  const ssrParams = {
    enableSSR: true,
    autoRotate: true,
    otherMeshes: true,
    groundReflector: true,
  };
  let groundReflector;
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
  const selects = [];
  let exrEnv;
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.setSize(widthScreen, heightScreen);

    cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      encoding: THREE.sRGBEncoding,
    });
    cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    cubeCamera.position.set(0, 0.5, 0);

    let geometryPlane = new THREE.PlaneGeometry(1, 1);
    groundReflector = new ReflectorForSSRPass(geometryPlane, {
      clipBias: 0.0003,
      textureWidth: window.innerWidth,
      textureHeight: window.innerHeight,
      color: 0x888888,
      useDepthTexture: true,
    });
    groundReflector.material.depthWrite = false;
    groundReflector.rotation.x = -Math.PI / 0x2;
    groundReflector.visible = false;

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    pmremCubeRenderTarget = pmremGenerator.fromEquirectangular(
      cubeRenderTarget.texture
    );
    internalEnvMap = pmremCubeRenderTarget?.texture;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      envMap: cubeRenderTarget.texture,
    });
    // const cube = new THREE.Mesh(geometry, material);
    // cube.position.set(0, 0.5, 0);
    // cube.scale.set(0.65, 0.65, 0.65);
    // cube.add(cubeCamera);
    // scene.add(cube);

    //create sphere
    // const ball1 = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), material);
    // ball1.position.set(3, 1.1, 0);
    // ball1.castShadow = true;
    // ball1.receiveShadow = true;
    // ball1.add(cubeCamera);
    // // pivot1.add(ball1);
    // scene.add(ball1);

    cubeCamera.update(renderer, scene);

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
    const gtaoPass = new GTAOPass(scene, camera, widthScreen, heightScreen);
    gtaoPass.output = GTAOPass.OUTPUT.Default;
    ssrPass = new SSRPass({
      renderer: renderer,
      scene: scene,
      camera: camera,
      width: widthScreen,
      height: heightScreen,
      groundReflector: groundReflector,
      selects: selects,
    });
    composer.addPass(ssrPass);
    composer.addPass(gtaoPass);
    const effectFXAA = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    effectFXAA.material.uniforms.resolution.value.x =
      1 / (canvas.offsetWidth * pixelRatio);
    effectFXAA.material.uniforms.resolution.value.y =
      1 / (canvas.offsetHeight * pixelRatio);
    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
    composer.addPass(gammaCorrectionPass);
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    composer.addPass(effectFXAA);

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
            if (noSelectSSR.includes(child.name)) {
            } else if (outSideVanElement.includes(child.name)) {
              child.material.envMap = exrEnv;
              selects.push(child);
            } else {
              child.material.envMap = cubeRenderTarget.texture;
              child.material.envMapIntensity = 0.35;
              child.material.needsUpdate = true;
              selects.push(child);
            }
            if (child.name == "Color_M00135" || child.name == "Color_M00426") {
              child.visible = false;
            }
            // const _0x4541c4 = new _0x1fb42a.Box3().setFromObject(scene);
            // gtaoPass.setSceneClipBox(_0x4541c4);
          }
        });
        cubeCamera.update(renderer, scene);
      },
      undefined,
      function (error) {
        console.error(error);
      }
    );

    updateEnvironment();

    const gui = new GUI();
    gui
      .add(gtaoPass, "output", {
        Default: GTAOPass.OUTPUT.Default,
        Diffuse: GTAOPass.OUTPUT.Diffuse,
        "AO Only": GTAOPass.OUTPUT.AO,
        "AO Only + Denoise": GTAOPass.OUTPUT.Denoise,
        Depth: GTAOPass.OUTPUT.Depth,
        Normal: GTAOPass.OUTPUT.Normal,
      })
      .onChange(function (_0x36e530) {
        gtaoPass.output = _0x36e530;
      });
    const aoParameters = {
      radius: 0.1,
      distanceExponent: 1.85,
      thickness: 0.5,
      scale: 1.5,
      samples: 0x20,
      distanceFallOff: 0x1,
      screenSpaceRadius: false,
    };
    const pdParameters = {
      lumaPhi: 0xa,
      depthPhi: 0x2,
      normalPhi: 0x3,
      radius: 0.5,
      radiusExponent: 0x1,
      rings: 0x2,
      samples: 0x20,
    };
    gtaoPass.updateGtaoMaterial(aoParameters);
    gtaoPass.updatePdMaterial(pdParameters);
    gui.add(gtaoPass, "blendIntensity").min(0).max(1).step(0.01);
    gui
      .add(aoParameters, "radius")
      .min(0.01)
      .max(1)
      .step(0.01)
      .onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
    gui
      .add(aoParameters, "distanceExponent")
      .min(1)
      .max(4)
      .step(0.01)
      .onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
    gui
      .add(aoParameters, "thickness")
      .min(0.01)
      .max(10)
      .step(0.01)
      .onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
    gui
      .add(aoParameters, "distanceFallOff")
      .min(0)
      .max(1)
      .step(0.01)
      .onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
    gui
      .add(aoParameters, "scale")
      .min(0.01)
      .max(2.0)
      .step(0.01)
      .onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
    gui
      .add(aoParameters, "samples")
      .min(2)
      .max(32)
      .step(1)
      .onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
    gui
      .add(aoParameters, "screenSpaceRadius")
      .onChange(() => gtaoPass.updateGtaoMaterial(aoParameters));
    gui
      .add(pdParameters, "lumaPhi")
      .min(0)
      .max(20)
      .step(0.01)
      .onChange(() => gtaoPass.updatePdMaterial(pdParameters));
    gui
      .add(pdParameters, "depthPhi")
      .min(0.01)
      .max(20)
      .step(0.01)
      .onChange(() => gtaoPass.updatePdMaterial(pdParameters));
    gui
      .add(pdParameters, "normalPhi")
      .min(0.01)
      .max(20)
      .step(0.01)
      .onChange(() => gtaoPass.updatePdMaterial(pdParameters));
    gui
      .add(pdParameters, "radius")
      .min(0)
      .max(32)
      .step(1)
      .onChange(() => gtaoPass.updatePdMaterial(pdParameters));
    gui
      .add(pdParameters, "radiusExponent")
      .min(0.1)
      .max(4)
      .step(0.1)
      .onChange(() => gtaoPass.updatePdMaterial(pdParameters));
    gui
      .add(pdParameters, "rings")
      .min(1)
      .max(16)
      .step(0.125)
      .onChange(() => gtaoPass.updatePdMaterial(pdParameters));
    gui
      .add(pdParameters, "samples")
      .min(2)
      .max(32)
      .step(1)
      .onChange(() => gtaoPass.updatePdMaterial(pdParameters));
    gui.add(ssrParams, "enableSSR").name("Enable SSR");
    gui.add(ssrParams, "groundReflector").onChange(() => {
      ssrPass.groundReflector = groundReflector;
      ssrPass.selects = selects;
    });
    ssrPass.thickness = 0.018;
    gui.add(ssrPass, "thickness").min(0x0).max(0.1).step(0.0001);
    ssrPass.infiniteThick = false;
    gui.add(ssrPass, "infiniteThick");
    gui.add(ssrParams, "autoRotate").onChange(() => {
      controls.enabled = false;
    });
    const ssrGui = gui.addFolder("more settings");
    ssrGui.add(ssrPass, "fresnel").onChange(() => {
      groundReflector.fresnel = ssrPass.fresnel;
    });
    ssrGui.add(ssrPass, "distanceAttenuation").onChange(() => {
      groundReflector.distanceAttenuation = ssrPass.distanceAttenuation;
    });
    ssrPass.maxDistance = 0.22;
    groundReflector.maxDistance = 0.22;
    ssrGui
      .add(ssrPass, "maxDistance")
      .min(0)
      .max(0.5)
      .step(0.001)
      .onChange(() => {
        groundReflector.maxDistance = ssrPass.maxDistance;
      });
    ssrGui.add(ssrParams, "otherMeshes").onChange(() => {
      otherMeshes.forEach((mesh) => (mesh.visible = true));
    });
    ssrGui.add(ssrPass, "bouncing");
    ssrGui
      .add(ssrPass, "output", {
        Default: SSRPass.OUTPUT.Default,
        "SSR Only": SSRPass.OUTPUT.SSR,
        Beauty: SSRPass.OUTPUT.Beauty,
        Depth: SSRPass.OUTPUT.Depth,
        Normal: SSRPass.OUTPUT.Normal,
        Metalness: SSRPass.OUTPUT.Metalness,
      })
      .onChange(function (value) {
        ssrPass.output = value;
      });
    ssrPass.opacity = 0.5;
    groundReflector.opacity = ssrPass.opacity;
    ssrGui
      .add(ssrPass, "opacity")
      .min(0)
      .max(1)
      .onChange(() => {
        groundReflector.opacity = ssrPass.opacity;
      });
    ssrGui.add(ssrPass, "blur");
    gui.close();
    controls.addEventListener("change", () => {});
  };

  const onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    composer.setSize(width, height);
    renderer.setSize(width, height);
  };

  const updateEnvironment = () => {
    const environment = environments.filter(
      (entry) => entry.name === "Forest"
    )[0];

    getCubeMapTexture(environment).then(({ envMap }) => {
      exrEnv = envMap;
      // scene.environment = envMap;
      // scene.background = initialState.background ? envMap : null;
    });
  };

  const getCubeMapTexture = (environment) => {
    console.log("environ: ", environment);
    const { id, path } = environment;

    // neutral (THREE.RoomEnvironment)
    if (id === "neutral") {
      return Promise.resolve({ envMap: neutralEnvironment });
    }

    // none
    if (id === "") {
      return Promise.resolve({ envMap: null });
    }

    return new Promise((resolve, reject) => {
      new EXRLoader().load(
        path,
        (texture) => {
          const envMap = pmremGenerator.fromEquirectangular(texture).texture;
          pmremGenerator.dispose();
          console.log("envMap: ", envMap);
          resolve({ envMap });
        },
        undefined,
        reject
      );
    });
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
