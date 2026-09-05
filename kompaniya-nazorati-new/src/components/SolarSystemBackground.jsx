import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getSavedBackground, getStoredBackground } from "./BackgroundSettings";
import { getCurrentUser } from "../utils/storage";

const PLANETS = [
  { distance: 6, size: .28, color: 0xb9a48c, speed: 1.8 },
  { distance: 10, size: .4, color: 0xd9b982, speed: 1.35 },
  { distance: 14, size: .5, color: 0x3d9b91, speed: 1.05, satellite: true },
  { distance: 18, size: .4, color: 0xc87958, speed: .82, satellite: true },
  { distance: 23, size: 1, color: 0xd5b17d, speed: .52 },
  { distance: 28, size: .85, color: 0xd6c18c, speed: .38, ring: true },
  { distance: 34, size: .62, color: 0x83b7c2, speed: .27 },
  { distance: 40, size: .58, color: 0x5277b5, speed: .2 },
];

function createPlanetTexture(color) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 128;
  const textureContext = textureCanvas.getContext("2d");
  const base = new THREE.Color(color);
  textureContext.fillStyle = `#${base.getHexString()}`;
  textureContext.fillRect(0, 0, 256, 128);
  for (let index = 0; index < 38; index += 1) {
    const shade = base.clone().offsetHSL(0, 0, (Math.random() - .5) * .22);
    textureContext.fillStyle = `rgba(${shade.r * 255}, ${shade.g * 255}, ${shade.b * 255}, .32)`;
    textureContext.beginPath();
    textureContext.ellipse(Math.random() * 256, Math.random() * 128, 4 + Math.random() * 22, 1 + Math.random() * 6, Math.random(), 0, Math.PI * 2);
    textureContext.fill();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function SolarSystemBackground({ preview = false }) {
  const containerRef = useRef(null);
  const [hasCustomBackground, setHasCustomBackground] = useState(() => !preview && Boolean(getSavedBackground()));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (preview) return undefined;
    const handleBackgroundChange = (event) => setHasCustomBackground(Boolean(event.detail?.src || event.detail?.type === "rainbow"));
    const handleSessionChange = (event) => {
      const userId = event.detail?.userId || event.detail?.user?.id;
      getStoredBackground(userId).then((media) => setHasCustomBackground(Boolean(media?.src))).catch(() => setHasCustomBackground(false));
    };
    const handleSettingsChange = (event) => setSettingsOpen(Boolean(event.detail?.open));
    window.addEventListener("app-background-change", handleBackgroundChange);
    window.addEventListener("app-session-change", handleSessionChange);
    window.addEventListener("app-background-settings", handleSettingsChange);
    getStoredBackground(getCurrentUser()?.id).then((media) => setHasCustomBackground(Boolean(media?.src))).catch(() => {});
    return () => {
      window.removeEventListener("app-background-change", handleBackgroundChange);
      window.removeEventListener("app-session-change", handleSessionChange);
      window.removeEventListener("app-background-settings", handleSettingsChange);
    };
  }, [preview]);

  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x020403, 24, 54);
    const getDimensions = () => ({
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
    });
    const dimensions = getDimensions();
    const themeColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue("--lime").trim() || "#c9f269");
    const themedMaterials = [];
    const camera = new THREE.PerspectiveCamera(60, dimensions.width / dimensions.height, .1, 180);
    camera.position.set(0, preview ? 7 : 12, preview ? Math.max(24, 28 / camera.aspect) : Math.max(38, 42 / camera.aspect));
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x527d70, 0x020403, .65));
    const sunLight = new THREE.PointLight(themeColor, 5, 50, 1.35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    scene.add(sunLight);

    const sunMaterial = new THREE.MeshBasicMaterial({ color: themeColor });
    themedMaterials.push(sunMaterial);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 32), sunMaterial);
    scene.add(sun);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({ color: themeColor, transparent: true, opacity: .1, side: THREE.BackSide });
    themedMaterials.push(sunGlowMaterial);
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 32, 32),
      sunGlowMaterial
    ));

    const planets = PLANETS.map((definition) => {
      const orbit = new THREE.Object3D();
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(definition.size, 20, 20),
        new THREE.MeshStandardMaterial({ map: createPlanetTexture(definition.color), roughness: .88, metalness: .02, bumpScale: .04 })
      );
      planet.castShadow = true;
      planet.receiveShadow = true;
      planet.position.x = definition.distance;
      orbit.rotation.y = Math.random() * Math.PI * 2;
      orbit.rotation.x = 0;
      orbit.userData.speed = definition.speed;
      orbit.userData.planet = planet;
      orbit.add(planet);
      scene.add(orbit);

      const points = Array.from({ length: 96 }, (_, index) => {
        const angle = (index / 96) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * definition.distance, 0, Math.sin(angle) * definition.distance);
      });
      const orbitLineMaterial = new THREE.LineBasicMaterial({ color: themeColor, transparent: true, opacity: .2 });
      themedMaterials.push(orbitLineMaterial);
      orbit.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        orbitLineMaterial
      ));

      if (definition.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(definition.size * 1.35, definition.size * 1.9, 48),
          new THREE.MeshBasicMaterial({ color: 0xe4cd9a, transparent: true, opacity: .72, side: THREE.DoubleSide })
        );
        ring.rotation.x = Math.PI / 2.5;
        planet.add(ring);
      }
      if (definition.satellite) {
        const satelliteOrbit = new THREE.Object3D();
        const satellite = new THREE.Mesh(
          new THREE.BoxGeometry(.045, .045, .16),
          new THREE.MeshStandardMaterial({ color: 0xd9e4d2, metalness: .7, roughness: .3 })
        );
        satellite.position.x = definition.size * 4.5;
        satelliteOrbit.add(satellite);
        satellite.add(new THREE.Mesh(
          new THREE.BoxGeometry(.3, .018, .1),
          new THREE.MeshBasicMaterial({ color: 0x5c8fa0 })
        ));
        satelliteOrbit.userData.speed = 2.4;
        planet.add(satelliteOrbit);
        orbit.userData.satelliteOrbit = satelliteOrbit;
      }
      return orbit;
    });

    const starPositions = new Float32Array(3600);
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = (Math.random() - .5) * 110;
      starPositions[index + 1] = (Math.random() - .5) * 86;
      starPositions[index + 2] = (Math.random() - .5) * 18 - 29;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starBasePositions = starPositions.slice();
    const starMaterial = new THREE.PointsMaterial({ color: themeColor, size: .09, transparent: true, opacity: .82, fog: false });
    themedMaterials.push(starMaterial);
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    const galaxyPositions = new Float32Array(1200);
    for (let index = 0; index < galaxyPositions.length; index += 3) {
      galaxyPositions[index] = (Math.random() - .5) * 110;
      galaxyPositions[index + 1] = (Math.random() - .5) * 86;
      galaxyPositions[index + 2] = -10 - Math.random() * 42;
    }
    const galaxyGeometry = new THREE.BufferGeometry();
    galaxyGeometry.setAttribute("position", new THREE.BufferAttribute(galaxyPositions, 3));
    const galaxyBasePositions = galaxyPositions.slice();
    const galaxy = new THREE.Points(galaxyGeometry, new THREE.PointsMaterial({ color: 0x8bd5ae, size: .14, transparent: true, opacity: .78, depthWrite: false, fog: false }));
    scene.add(galaxy);

    const handleThemeChange = (event) => {
      const nextColor = new THREE.Color(event.detail?.color || "#c9f269");
      sunLight.color.copy(nextColor);
      themedMaterials.forEach((material) => material.color.copy(nextColor));
    };
    window.addEventListener("app-theme-change", handleThemeChange);

    const startTime = performance.now();
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - .5) * 2;
      pointer.y = (event.clientY / window.innerHeight - .5) * 2;
    };
    const onResize = () => {
      const nextDimensions = getDimensions();
      camera.aspect = nextDimensions.width / nextDimensions.height;
      camera.position.z = preview ? Math.max(24, 28 / camera.aspect) : Math.max(38, 42 / camera.aspect);
      camera.updateProjectionMatrix();
      renderer.setSize(nextDimensions.width, nextDimensions.height);
    };

    const animate = (time) => {
      const elapsed = (time - startTime) / 1000;
      planets.forEach((orbit) => {
        orbit.rotation.y += orbit.userData.speed * .01;
        orbit.userData.planet.rotation.y += .006;
        if (orbit.userData.satelliteOrbit) orbit.userData.satelliteOrbit.rotation.y += orbit.userData.satelliteOrbit.userData.speed * .01;
      });
      for (let index = 0; index < starPositions.length; index += 3) {
        const offset = Math.sin(elapsed * .8 + index) * .003;
        starPositions[index] = starBasePositions[index] + offset;
        starPositions[index + 1] = starBasePositions[index + 1] + offset * .35;
      }
      starGeometry.attributes.position.needsUpdate = true;
      for (let index = 0; index < galaxyPositions.length; index += 3) {
        const offset = Math.sin(elapsed * .65 + index) * .003;
        galaxyPositions[index] = galaxyBasePositions[index] + offset;
        galaxyPositions[index + 1] = galaxyBasePositions[index + 1] + offset * .35;
      }
      galaxyGeometry.attributes.position.needsUpdate = true;
      sun.scale.setScalar(1 + Math.sin(elapsed * 1.4) * .035);
      camera.position.x += (pointer.x * .42 - camera.position.x) * .015;
      camera.position.y += (16 - pointer.y * .38 - camera.position.y) * .015;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    let frameId = window.requestAnimationFrame(animate);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("app-theme-change", handleThemeChange);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className={`solar-system-canvas${preview ? " solar-system-canvas-preview" : ""}${hasCustomBackground && !settingsOpen ? " has-custom-background" : ""}`} aria-hidden="true" />;
}

export default SolarSystemBackground;
