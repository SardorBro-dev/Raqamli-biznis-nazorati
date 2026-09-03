import { useEffect, useRef } from "react";
import * as THREE from "three";

const FISH_COLORS = [0xff7a6e, 0xffd166, 0x54d5b7, 0x72c8ff, 0xb38cff, 0xff9f5a];

function createFish(color, scale) {
  const fish = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.18,
    roughness: 0.24,
    metalness: 0.08,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 12), material);
  body.scale.set(1.45, 0.72, 0.7);
  fish.add(body);

  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 0.82, 4),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, roughness: 0.3 })
  );
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -0.98;
  fish.add(tail);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x10202a });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), eyeMaterial);
  eye.position.set(0.5, 0.2, 0.42);
  fish.add(eye);
  fish.scale.setScalar(scale);
  return fish;
}

function AquariumBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a3d55, 12, 48);

    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 1, 25);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x8de9ff, 0x062532, 1.6));
    const aquaLight = new THREE.PointLight(0x43e0df, 22, 32, 2);
    aquaLight.position.set(-7, 7, 8);
    scene.add(aquaLight);
    const warmLight = new THREE.PointLight(0xffa56f, 16, 26, 2);
    warmLight.position.set(7, -2, 5);
    scene.add(warmLight);

    const aquariumFloor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 64),
      new THREE.MeshStandardMaterial({ color: 0x08718a, emissive: 0x063a4a, emissiveIntensity: 0.5, roughness: 0.8 })
    );
    aquariumFloor.rotation.x = -Math.PI / 2;
    aquariumFloor.position.y = -8.5;
    aquariumFloor.position.z = -3;
    scene.add(aquariumFloor);

    const decor = new THREE.Group();
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x315767, roughness: 0.92, metalness: 0.02 });
    for (let index = 0; index < 13; index += 1) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.8, 1), rockMaterial);
      rock.position.set(-13 + index * 2.1 + Math.random() * 1.1, -7.8 + Math.random() * 0.6, -5 + Math.random() * 3);
      rock.scale.y = 0.6;
      decor.add(rock);
    }

    for (let index = 0; index < 12; index += 1) {
      const plant = new THREE.Group();
      const height = 1.8 + Math.random() * 2.8;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.13, height, 8),
        new THREE.MeshStandardMaterial({ color: index % 2 ? 0x39c69e : 0x84d96b, emissive: 0x0b563e, emissiveIntensity: 0.4, roughness: 0.65 })
      );
      stem.position.y = height / 2 - 7.7;
      plant.add(stem);
      plant.position.set(-12 + index * 2.1, 0, -4.5 + Math.random() * 1.8);
      plant.rotation.z = (Math.random() - 0.5) * 0.25;
      decor.add(plant);
    }

    const homeMaterial = new THREE.MeshStandardMaterial({ color: 0xff8b70, emissive: 0x6d241f, emissiveIntensity: 0.3, roughness: 0.5 });
    [-9, 8].forEach((x, index) => {
      const home = new THREE.Group();
      const cave = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.38, 12, 28), homeMaterial);
      cave.rotation.y = Math.PI / 2;
      home.add(cave);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.55, 16), rockMaterial);
      base.position.y = -0.75;
      home.add(base);
      home.position.set(x, -5.9, -4.5 + index * 1.2);
      decor.add(home);
    });
    scene.add(decor);

    const fishGroup = new THREE.Group();
    const fish = [];
    for (let index = 0; index < 28; index += 1) {
      const fishObject = createFish(FISH_COLORS[index % FISH_COLORS.length], 0.48 + Math.random() * 0.52);
      const side = index % 2 === 0 ? -1 : 1;
      fishObject.position.set((Math.random() - 0.5) * 25, -5.5 + Math.random() * 10, -1 - Math.random() * 15);
      fishObject.userData = {
        origin: fishObject.position.clone(),
        home: new THREE.Vector3(side * (8 + Math.random() * 2), -5.4 + Math.random() * 1.5, -5 + Math.random() * 1.5),
        phase: Math.random() * Math.PI * 2,
        speed: 0.18 + Math.random() * 0.18,
        direction: Math.random() > 0.5 ? 1 : -1,
      };
      fishGroup.add(fishObject);
      fish.push(fishObject);
    }
    scene.add(fishGroup);

    const bubblePositions = new Float32Array(480);
    for (let index = 0; index < bubblePositions.length; index += 3) {
      bubblePositions[index] = (Math.random() - 0.5) * 30;
      bubblePositions[index + 1] = -8 + Math.random() * 19;
      bubblePositions[index + 2] = -3 - Math.random() * 17;
    }
    const bubbleGeometry = new THREE.BufferGeometry();
    bubbleGeometry.setAttribute("position", new THREE.BufferAttribute(bubblePositions, 3));
    const bubbles = new THREE.Points(
      bubbleGeometry,
      new THREE.PointsMaterial({ color: 0xb6f8ff, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false })
    );
    scene.add(bubbles);

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
      fish.forEach((fishObject) => {
        const { origin, home, phase, speed, direction } = fishObject.userData;
        const cycle = (elapsed * speed + phase) % (Math.PI * 2);
        const homeWeight = (Math.sin(cycle) + 1) / 2;
        const targetX = THREE.MathUtils.lerp(origin.x, home.x, homeWeight * homeWeight);
        const targetY = THREE.MathUtils.lerp(origin.y, home.y, homeWeight * homeWeight);
        fishObject.position.x = targetX + Math.sin(elapsed * 0.8 + phase) * 1.2;
        fishObject.position.y = targetY + Math.sin(elapsed * 1.1 + phase) * 0.45;
        fishObject.position.z = THREE.MathUtils.lerp(origin.z, home.z, homeWeight) + Math.cos(elapsed * 0.7 + phase) * 0.7;
        fishObject.rotation.y = direction * (Math.PI / 2 + Math.sin(elapsed * 0.5 + phase) * 0.18);
        fishObject.rotation.z = Math.sin(elapsed * 1.2 + phase) * 0.12;
      });
      decor.children.forEach((object, index) => {
        if (index >= 13 && index < 25) object.rotation.z = Math.sin(elapsed * 0.7 + index) * 0.16;
      });
      bubbles.rotation.y += 0.00035;
      camera.position.x += (Math.sin(elapsed * 0.18) * 3.2 + pointer.x * 1.2 - camera.position.x) * 0.012;
      camera.position.y += (1.2 + Math.sin(elapsed * 0.23) * 2.2 - pointer.y * 0.8 - camera.position.y) * 0.012;
      camera.position.z += (24 + Math.cos(elapsed * 0.15) * 2.5 - camera.position.z) * 0.01;
      camera.lookAt(Math.sin(elapsed * 0.2) * 1.5, -2.3 + Math.cos(elapsed * 0.16) * 1.2, -3);
      aquaLight.intensity = 20 + Math.sin(elapsed * 1.2) * 4;
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

  return <div ref={containerRef} className="solar-system-canvas aquarium-canvas" aria-hidden="true" />;
}

export default AquariumBackground;
