<script>
  import * as _0x1fb42a from "../build/three.module";
  import { onMount } from "svelte";
  import { GLTFLoader } from "../js/GLTFLoader";
  import { OrbitControls } from "../js/OrbitControls";
  import { TWEEN } from "../js/tween.module.min.js";
  import { EXRLoader } from "../js/EXRLoader.js";
  import { environments } from "../public/assets/environment/index.js";
  import { RoomEnvironment } from "../js/RoomEnvironment.js";
  import { sRGBEncoding } from "../build/three.module";
  import { EffectComposer } from "../js/post-processing/EffectComposer.js";
  import { RenderPass } from "../js/RenderPass.js";
  import { GTAOPass } from "../js/post-processing/GTAOPass.js";
  import { OutputPass } from "../js/post-processing/OutputPass.js";
  import { ReflectorForSSRPass } from "../js/post-processing/ReflectorForSSRPass.js";
  import { SSRPass } from "../js/post-processing/SSRPass.js";
  import { GammaCorrectionShader } from "../js/shaders/GammaCorrectionShader.js";
  import "../js/shaders/LuminosityShader.js";
  import { ShaderPass } from "../js/post-processing/ShaderPass.js";
  import { FXAAShader } from "../js/post-processing/FXAAShader.js";
  import { GUI } from "../js/lil-gui.module.min.js";
  let canvas;
  let renderer;
  let controls;
  let loader;
  let scene;
  let camera;
  let clock;
  let van;
  let composer;
  let exrEnv;
  let startTime;
  startTime = new Date();
  let pmremGenerator;
  let neutralEnvironment;
  let cubeRenderTarget;
  let cubeCamera;
  const ssrParams = {
    enableSSR: true,
    autoRotate: true,
    otherMeshes: true,
    groundReflector: true,
  };
  let ssrPass;
  const otherMeshes = [];
  let groundReflector;
  const selects = [];
  let pmremCubeRenderTarget;
  let internalEnvMap;
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
  const init = () => {
    camera = new _0x1fb42a.PerspectiveCamera(
      0x4b,
      widthScreen / heightScreen,
      0.1,
      0x64
    );
    camera.position.set(0x0, 0x3, -0x1);
    scene = new _0x1fb42a.Scene();
    scene.background = new _0x1fb42a.Color(0xcccccc);
    clock = new _0x1fb42a.Clock();
    scene.add(camera);
    const _0x5a76e1 = new _0x1fb42a.AmbientLight(0xffffff, 0.5);
    _0x5a76e1.name = "ambient_light";
    scene.add(_0x5a76e1);
    const _0x139772 = new _0x1fb42a.DirectionalLight(0xffffff, 0.8 * Math.PI);
    _0x139772.castShadow = true;
    _0x139772.shadow.camera.top = 0x7d0;
    _0x139772.shadow.camera.bottom = -0x7d0;
    _0x139772.shadow.camera.left = -0x7d0;
    _0x139772.shadow.camera.right = 0x7d0;
    _0x139772.shadow.camera.near = 0x4b0;
    _0x139772.shadow.camera.far = 0x9c4;
    _0x139772.shadow.bias = 0.0001;
    _0x139772.shadow.mapSize.width = 0x800;
    _0x139772.shadow.mapSize.height = 0x400;
    scene.add(_0x139772);
    renderer = new _0x1fb42a.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = sRGBEncoding;
    renderer.setClearColor(0xcccccc);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(widthScreen, heightScreen);
    renderer.toneMapping = _0x1fb42a.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = _0x1fb42a.PCFShadowMap;
    cubeRenderTarget = new _0x1fb42a.WebGLCubeRenderTarget(0x800, {
      format: _0x1fb42a.RGBAFormat,
      generateMipmaps: true,
      minFilter: _0x1fb42a.LinearMipmapLinearFilter,
      encoding: _0x1fb42a.sRGBEncoding,
    });
    cubeCamera = new _0x1fb42a.CubeCamera(0x1, 0x2710, cubeRenderTarget);
    cubeCamera.scale.set(0.1, 0.1, 0.1);
    cubeCamera.position.set(-0.3, 0.65, 0x0);
    const _0x216f95 = new _0x1fb42a.BoxGeometry(0x1, 0x1, 0x1);
    const _0xae0711 = new _0x1fb42a.MeshBasicMaterial({
      color: 0xff00,
    });
    const _0x244443 = new _0x1fb42a.Mesh(_0x216f95, _0xae0711);
    _0x244443.position.set(-0.3, 0.65, 0x0);
    let _0x32e449 = new _0x1fb42a.PlaneGeometry(0x19, 0x19);
    groundReflector = new ReflectorForSSRPass(_0x32e449, {
      clipBias: 0.0003,
      textureWidth: window.innerWidth,
      textureHeight: window.innerHeight,
      color: 0x888888,
      useDepthTexture: true,
    });
    groundReflector.material.depthWrite = false;
    groundReflector.rotation.x = -Math.PI / 0x2;
    groundReflector.visible = false;
    cubeCamera.update(renderer, scene);
    pmremGenerator = new _0x1fb42a.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    pmremCubeRenderTarget = pmremGenerator.fromEquirectangular(
      cubeRenderTarget.texture
    );
    internalEnvMap = pmremCubeRenderTarget?.["texture"];
    neutralEnvironment = pmremGenerator.fromScene(
      new RoomEnvironment()
    ).texture;
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.5;
    composer = new EffectComposer(renderer);
    const _0xe3e16e = new RenderPass(scene, camera);
    composer.addPass(_0xe3e16e);
    const _0xbd48e = new GTAOPass(scene, camera, widthScreen, heightScreen);
    _0xbd48e.output = GTAOPass.OUTPUT.Default;
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
    composer.addPass(_0xbd48e);
    const _0x16a78f = new ShaderPass(FXAAShader);
    const _0x53a701 = renderer.getPixelRatio();
    _0x16a78f.material.uniforms.resolution.value.x =
      0x1 / (canvas.offsetWidth * _0x53a701);
    _0x16a78f.material.uniforms.resolution.value.y =
      0x1 / (canvas.offsetHeight * _0x53a701);
    const _0x1c21bf = new ShaderPass(GammaCorrectionShader);
    composer.addPass(_0x1c21bf);
    const _0x3c0aa9 = new OutputPass();
    composer.addPass(_0x3c0aa9);
    composer.addPass(_0x16a78f);
    loader = new GLTFLoader();
    loader.load(
      "./assets/models/van/van2.glb",
      function (_0x10c0ac) {
        van = _0x10c0ac.scene;
        van.scale.set(0xa, 0xa, 0xa);
        scene.add(van);
        _0x10c0ac.scene.traverse(function (_0x432940) {
          if (_0x432940.isMesh) {
            _0x432940.castShadow = true;
            _0x432940.receiveShadow = true;
            if (noSelectSSR.includes(_0x432940.name)) {
            } else if (outSideVanElement.includes(_0x432940.name)) {
              _0x432940.material.envMap = exrEnv;
              selects.push(_0x432940);
            } else {
              _0x432940.material.envMap = cubeRenderTarget.texture;
              _0x432940.material.envMapIntensity = 0.35;
              _0x432940.material.needsUpdate = true;
              selects.push(_0x432940);
            }
            if (
              _0x432940.name == "Color_M00135" ||
              _0x432940.name == "Color_M00426"
            ) {
              _0x432940.visible = false;
            }
            const _0x4541c4 = new _0x1fb42a.Box3().setFromObject(scene);
            _0xbd48e.setSceneClipBox(_0x4541c4);
          }
        });
        cubeCamera.update(renderer, scene);
      },
      undefined,
      function (_0x4f5e61) {
        console.error(_0x4f5e61);
      }
    );
    updateEnvironment();
    cubeCamera.update(renderer, scene);
    const _0x5919e7 = new GUI();
    _0x5919e7
      .add(_0xbd48e, "output", {
        Default: GTAOPass.OUTPUT.Default,
        Diffuse: GTAOPass.OUTPUT.Diffuse,
        "AO Only": GTAOPass.OUTPUT.AO,
        "AO Only + Denoise": GTAOPass.OUTPUT.Denoise,
        Depth: GTAOPass.OUTPUT.Depth,
        Normal: GTAOPass.OUTPUT.Normal,
      })
      .onChange(function (_0x36e530) {
        _0xbd48e.output = _0x36e530;
      });
    const _0x25a457 = {
      radius: 0.2,
      distanceExponent: 1.85,
      thickness: 0.5,
      scale: 1.5,
      samples: 0x20,
      distanceFallOff: 0x1,
      screenSpaceRadius: false,
    };
    const _0x474a4d = {
      lumaPhi: 0xa,
      depthPhi: 0x2,
      normalPhi: 0x3,
      radius: 0.5,
      radiusExponent: 0x1,
      rings: 0x2,
      samples: 0x20,
    };
    _0xbd48e.updateGtaoMaterial(_0x25a457);
    _0xbd48e.updatePdMaterial(_0x474a4d);
    _0x5919e7.add(_0xbd48e, "blendIntensity").min(0x0).max(0x1).step(0.01);
    _0x5919e7
      .add(_0x25a457, "radius")
      .min(0.01)
      .max(0x1)
      .step(0.01)
      .onChange(() => _0xbd48e.updateGtaoMaterial(_0x25a457));
    _0x5919e7
      .add(_0x25a457, "distanceExponent")
      .min(0x1)
      .max(0x4)
      .step(0.01)
      .onChange(() => _0xbd48e.updateGtaoMaterial(_0x25a457));
    _0x5919e7
      .add(_0x25a457, "thickness")
      .min(0.01)
      .max(0xa)
      .step(0.01)
      .onChange(() => _0xbd48e.updateGtaoMaterial(_0x25a457));
    _0x5919e7
      .add(_0x25a457, "distanceFallOff")
      .min(0x0)
      .max(0x1)
      .step(0.01)
      .onChange(() => _0xbd48e.updateGtaoMaterial(_0x25a457));
    _0x5919e7
      .add(_0x25a457, "scale")
      .min(0.01)
      .max(0x2)
      .step(0.01)
      .onChange(() => _0xbd48e.updateGtaoMaterial(_0x25a457));
    _0x5919e7
      .add(_0x25a457, "samples")
      .min(0x2)
      .max(0x20)
      .step(0x1)
      .onChange(() => _0xbd48e.updateGtaoMaterial(_0x25a457));
    _0x5919e7
      .add(_0x25a457, "screenSpaceRadius")
      .onChange(() => _0xbd48e.updateGtaoMaterial(_0x25a457));
    _0x5919e7
      .add(_0x474a4d, "lumaPhi")
      .min(0x0)
      .max(0x14)
      .step(0.01)
      .onChange(() => _0xbd48e.updatePdMaterial(_0x474a4d));
    _0x5919e7
      .add(_0x474a4d, "depthPhi")
      .min(0.01)
      .max(0x14)
      .step(0.01)
      .onChange(() => _0xbd48e.updatePdMaterial(_0x474a4d));
    _0x5919e7
      .add(_0x474a4d, "normalPhi")
      .min(0.01)
      .max(0x14)
      .step(0.01)
      .onChange(() => _0xbd48e.updatePdMaterial(_0x474a4d));
    _0x5919e7
      .add(_0x474a4d, "radius")
      .min(0x0)
      .max(0x20)
      .step(0x1)
      .onChange(() => _0xbd48e.updatePdMaterial(_0x474a4d));
    _0x5919e7
      .add(_0x474a4d, "radiusExponent")
      .min(0.1)
      .max(0x4)
      .step(0.1)
      .onChange(() => _0xbd48e.updatePdMaterial(_0x474a4d));
    _0x5919e7
      .add(_0x474a4d, "rings")
      .min(0x1)
      .max(0x10)
      .step(0.125)
      .onChange(() => _0xbd48e.updatePdMaterial(_0x474a4d));
    _0x5919e7
      .add(_0x474a4d, "samples")
      .min(0x2)
      .max(0x20)
      .step(0x1)
      .onChange(() => _0xbd48e.updatePdMaterial(_0x474a4d));
    _0x5919e7.add(ssrParams, "enableSSR").name("Enable SSR");
    _0x5919e7.add(ssrParams, "groundReflector").onChange(() => {
      ssrPass.groundReflector = groundReflector;
      ssrPass.selects = selects;
    });
    ssrPass.thickness = 0.018;
    _0x5919e7.add(ssrPass, "thickness").min(0x0).max(0.1).step(0.0001);
    ssrPass.infiniteThick = false;
    _0x5919e7.add(ssrPass, "infiniteThick");
    _0x5919e7.add(ssrParams, "autoRotate").onChange(() => {
      controls.enabled = false;
    });
    const _0x339732 = _0x5919e7.addFolder("more settings");
    _0x339732.add(ssrPass, "fresnel").onChange(() => {
      groundReflector.fresnel = ssrPass.fresnel;
    });
    _0x339732.add(ssrPass, "distanceAttenuation").onChange(() => {
      groundReflector.distanceAttenuation = ssrPass.distanceAttenuation;
    });
    ssrPass.maxDistance = 0.22;
    groundReflector.maxDistance = ssrPass.maxDistance;
    _0x339732
      .add(ssrPass, "maxDistance")
      .min(0x0)
      .max(0.5)
      .step(0.001)
      .onChange(() => {
        groundReflector.maxDistance = ssrPass.maxDistance;
      });
    _0x339732.add(ssrParams, "otherMeshes").onChange(() => {
      otherMeshes.forEach((_0x36712d) => (_0x36712d.visible = true));
    });
    _0x339732.add(ssrPass, "bouncing");
    _0x339732
      .add(ssrPass, "output", {
        Default: SSRPass.OUTPUT.Default,
        "SSR Only": SSRPass.OUTPUT.SSR,
        Beauty: SSRPass.OUTPUT.Beauty,
        Depth: SSRPass.OUTPUT.Depth,
        Normal: SSRPass.OUTPUT.Normal,
        Metalness: SSRPass.OUTPUT.Metalness,
      })
      .onChange(function (_0x424e1c) {
        ssrPass.output = _0x424e1c;
      });
    ssrPass.opacity = 0.5;
    groundReflector.opacity = ssrPass.opacity;
    _0x339732
      .add(ssrPass, "opacity")
      .min(0x0)
      .max(0x1)
      .onChange(() => {
        groundReflector.opacity = ssrPass.opacity;
      });
    _0x339732.add(ssrPass, "blur");
    _0x5919e7.close();
    controls.addEventListener("change", () => {});
  };
  const updateEnvironment = () => {
    const _0x2361a4 = environments.filter(
      (_0x2a1718) => _0x2a1718.name === "Forest"
    )[0x0];
    getCubeMapTexture(_0x2361a4).then(({ envMap: _0x5527d0 }) => {
      exrEnv = _0x5527d0;
    });
  };
  const getCubeMapTexture = (_0x22374d) => {
    console.log("environ: ", _0x22374d);
    const { id: _0x4bb1f8, path: _0x37186d } = _0x22374d;
    if (_0x4bb1f8 === "neutral") {
      return Promise.resolve({
        envMap: neutralEnvironment,
      });
    }
    if (_0x4bb1f8 === "") {
      return Promise.resolve({
        envMap: null,
      });
    }
    return new Promise((_0x1ff8a0, _0x2275dd) => {
      new EXRLoader().load(
        _0x37186d,
        (_0x2e39c3) => {
          const _0x56acb5 =
            pmremGenerator.fromEquirectangular(_0x2e39c3).texture;
          pmremGenerator.dispose();
          console.log("envMap: ", _0x56acb5);
          _0x1ff8a0({
            envMap: _0x56acb5,
          });
        },
        undefined,
        _0x2275dd
      );
    });
  };
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    TWEEN.update();
    composer.render();
  };

  function onWindowResize() {
    const _0x496816 = window.innerWidth;
    const _0x349113 = window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(_0x496816, _0x349113);
    composer.setSize(_0x496816, _0x349113);
    groundReflector.getRenderTarget().setSize(_0x496816, _0x349113);
    groundReflector.resolution.set(_0x496816, _0x349113);
  }
  onMount(() => {
    init();
    animate();
    window.addEventListener("resize", onWindowResize);
  });
</script>
