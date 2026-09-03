import { useEffect, useRef } from "react";
import * as THREE from "three";

const COLORS = [0x9ee870, 0x6dd7c2, 0x83a8e8, 0xd8c17f, 0x9faeca];
const ASTEROID_COLORS = [0x3e8ca6, 0x6e5bb5, 0x4ba879, 0xb38a4b, 0x8f536f];

function createSatellite(scale) {
  const satellite = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.58, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x9aa7b4, metalness: 0.9, roughness: 0.22 })
  );
  satellite.add(body);
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x263f72, metalness: 0.45, roughness: 0.34, emissive: 0x101a38, emissiveIntensity: 0.45 });
  [-1.05, 1.05].forEach((x) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.7), panelMaterial);
    panel.position.x = x;
    satellite.add(panel);
  });
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8),
    new THREE.MeshBasicMaterial({ color: 0xb7c3d4 })
  );
  antenna.rotation.z = Math.PI / 2;
  antenna.position.y = 0.48;
  satellite.add(antenna);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x7dff72 })
  );
  beacon.position.y = -0.36;
  satellite.add(beacon);
  satellite.scale.setScalar(scale);
  satellite.traverse((part) => {
    if (part.isMesh) part.castShadow = true;
  });
  return satellite;
}

function createComet(color, scale) {
  const comet = new THREE.Group();
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 14),
    new THREE.MeshBasicMaterial({ color })
  );
  comet.add(head);
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 3.8, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -1.8;
  comet.add(tail);
  comet.scale.setScalar(scale);
  return comet;
}

function SpaceBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x02050b, 18, 70);
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(0, 0, 25);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x1d2945, 0.6));
    const blueLight = new THREE.PointLight(0x4d6ee8, 20, 42, 2);
    blueLight.position.set(-8, 5, 8);
    scene.add(blueLight);
    const greenLight = new THREE.PointLight(0x55e878, 16, 34, 2);
    greenLight.position.set(8, -4, 4);
    scene.add(greenLight);

    const nebulaPositions = new Float32Array(4200);
    for (let index = 0; index < nebulaPositions.length; index += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.pow(Math.random(), 0.55) * 34;
      nebulaPositions[index] = Math.cos(angle) * radius + (Math.random() - 0.5) * 5;
      nebulaPositions[index + 1] = Math.sin(angle) * radius * 0.3 + (Math.random() - 0.5) * 14;
      nebulaPositions[index + 2] = -8 - Math.random() * 30;
    }
    const nebulaGeometry = new THREE.BufferGeometry();
    nebulaGeometry.setAttribute("position", new THREE.BufferAttribute(nebulaPositions, 3));
    scene.add(new THREE.Points(nebulaGeometry, new THREE.PointsMaterial({ color: 0x39b879, size: 0.16, transparent: true, opacity: 0.24, depthWrite: false })));

    const starPositions = new Float32Array(3000);
    for (let index = 0; index < starPositions.length; index += 3) {
      starPositions[index] = (Math.random() - 0.5) * 75;
      starPositions[index + 1] = (Math.random() - 0.5) * 42;
      starPositions[index + 2] = -4 - Math.random() * 60;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb8c9ed, size: 0.055, transparent: true, opacity: 0.85, fog: false })));

    const asteroids = new THREE.Group();
    for (let index = 0; index < 50; index += 1) {
      const color = ASTEROID_COLORS[index % ASTEROID_COLORS.length];
      const asteroid = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.8, 1),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.24, metalness: 0.42, roughness: 0.58, flatShading: true })
      );
      asteroid.position.set((Math.random() - 0.5) * 27, -10 + Math.random() * 20, -2 - Math.random() * 13);
      asteroid.scale.y = 0.55 + Math.random() * 0.7;
      asteroid.scale.x = 0.7 + Math.random() * 0.8;
      asteroid.castShadow = true;
      asteroid.userData = { spin: (Math.random() - 0.5) * 0.012, phase: Math.random() * 6 };
      asteroids.add(asteroid);
    }
    scene.add(asteroids);

    const satellites = [];
    const satelliteGroup = new THREE.Group();
    for (let index = 0; index < 15; index += 1) {
      const satellite = createSatellite(1.05 + Math.random() * 0.7);
      satellite.position.set((Math.random() - 0.5) * 25, -9 + Math.random() * 18, -2 - Math.random() * 13);
      satellite.userData = { origin: satellite.position.clone(), phase: Math.random() * 6.28, speed: 0.12 + Math.random() * 0.15 };
      satelliteGroup.add(satellite);
      satellites.push(satellite);
    }
    scene.add(satelliteGroup);

    const comets = [];
    const cometGroup = new THREE.Group();
    for (let index = 0; index < 15; index += 1) {
      const comet = createComet(COLORS[index % COLORS.length], 0.8 + Math.random() * 0.9);
      comet.position.set(-15 + Math.random() * 30, -10 + Math.random() * 20, -2 - Math.random() * 14);
      comet.userData = { startX: comet.position.x, phase: Math.random() * 6.28, speed: 0.45 + Math.random() * 0.55 };
      cometGroup.add(comet);
      comets.push(comet);
    }
    scene.add(cometGroup);

    const pointer = { x: 0, y: 0 };
    const startTime = performance.now();
    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    const animate = (time) => {
      const elapsed = (time - startTime) / 1000;
      asteroids.children.forEach((asteroid) => {
        asteroid.rotation.x += asteroid.userData.spin;
        asteroid.rotation.y += asteroid.userData.spin * 1.4;
      });
      satellites.forEach((satellite) => {
        const { origin, phase, speed } = satellite.userData;
        satellite.position.x = origin.x + Math.sin(elapsed * speed + phase) * 2.2;
        satellite.position.y = origin.y + Math.cos(elapsed * speed * 0.8 + phase) * 1.3;
        satellite.rotation.x += 0.002;
        satellite.rotation.y += 0.004;
      });
      comets.forEach((comet) => {
        const cycle = (elapsed * comet.userData.speed + comet.userData.phase) % 16;
        comet.position.x = -16 + cycle * 2;
        comet.position.y += Math.sin(elapsed * 0.8 + comet.userData.phase) * 0.002;
        if (comet.position.x > 16) comet.position.x = -16;
        comet.rotation.z = Math.sin(elapsed * 0.4 + comet.userData.phase) * 0.15;
      });
      camera.position.x += (Math.sin(elapsed * 0.13) * 2.8 + pointer.x * 1.4 - camera.position.x) * 0.01;
      camera.position.y += (Math.sin(elapsed * 0.19) * 1.8 - pointer.y * 0.9 - camera.position.y) * 0.01;
      camera.position.z += (25 + Math.sin(elapsed * 0.11) * 2.2 - camera.position.z) * 0.01;
      camera.lookAt(Math.sin(elapsed * 0.14) * 1.5, Math.cos(elapsed * 0.16) * 0.7, -5);
      blueLight.intensity = 12 + Math.sin(elapsed * 0.8) * 3;
      greenLight.intensity = 9 + Math.cos(elapsed * 1.1) * 3;
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
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="solar-system-canvas space-background" aria-hidden="true" />;
}

export default SpaceBackground;
