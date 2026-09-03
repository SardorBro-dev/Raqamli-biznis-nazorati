import { useEffect, useRef } from "react";
import * as THREE from "three";

function AtmosphereBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x050a08, 18, 66);

    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 140);
    camera.position.set(0, 1.5, 24);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x8ed8c5, 0x030604, 1.2));
    const limeLight = new THREE.PointLight(0xdfff83, 18, 34, 2);
    limeLight.position.set(-3, 3, 4);
    scene.add(limeLight);
    const tealLight = new THREE.PointLight(0x35c4ad, 12, 30, 2);
    tealLight.position.set(4, -2, 1);
    scene.add(tealLight);

    const core = new THREE.Group();
    core.position.y = -3;
    core.rotation.set(0.35, -0.25, 0.2);
    scene.add(core);

    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.15, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x8bd5ae,
        emissive: 0x1e6a63,
        emissiveIntensity: 0.72,
        metalness: 0.28,
        roughness: 0.16,
        transmission: 0.22,
        transparent: true,
        opacity: 0.92,
      })
    );
    core.add(crystal);

    const wireframe = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.36, 1),
      new THREE.MeshBasicMaterial({ color: 0xdfff83, wireframe: true, transparent: true, opacity: 0.52 })
    );
    core.add(wireframe);

    const ringColors = [0xdfff83, 0x54d5b7, 0xf28d55];
    const rings = ringColors.map((color, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.5 + index * 0.42, 0.025 + index * 0.012, 10, 128),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 - index * 0.12 })
      );
      ring.rotation.set(index * 0.75 + 0.35, index * 0.5, index * 0.32);
      ring.position.y = -3;
      scene.add(ring);
      return ring;
    });

    const nodes = new THREE.Group();
    const nodeGeometry = new THREE.SphereGeometry(0.12, 12, 12);
    ringColors.forEach((color, ringIndex) => {
      for (let index = 0; index < 5; index += 1) {
        const node = new THREE.Mesh(
          nodeGeometry,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 })
        );
        node.userData = { ringIndex, angle: (index / 5) * Math.PI * 2 };
        nodes.add(node);
      }
    });
    nodes.position.y = -3;
    scene.add(nodes);

    const particlePositions = new Float32Array(1800);
    for (let index = 0; index < particlePositions.length; index += 3) {
      const radius = 8 + Math.random() * 27;
      const angle = Math.random() * Math.PI * 2;
      particlePositions[index] = Math.cos(angle) * radius;
      particlePositions[index + 1] = (Math.random() - 0.5) * 25;
      particlePositions[index + 2] = Math.sin(angle) * radius - 8;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0xc9f269, size: 0.055, transparent: true, opacity: 0.75, fog: false })
    );
    scene.add(particles);

    const floatingModels = new THREE.Group();
    const modelGeometries = [
      new THREE.IcosahedronGeometry(0.42, 1),
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.TorusGeometry(0.42, 0.075, 10, 32),
      new THREE.BoxGeometry(0.62, 0.62, 0.62),
    ];
    const modelColors = [0xdfff83, 0x54d5b7, 0xff9b78, 0x9b8cff, 0x72c8ff];
    for (let index = 0; index < 90; index += 1) {
      const color = modelColors[index % modelColors.length];
      const model = new THREE.Mesh(
        modelGeometries[index % modelGeometries.length],
        new THREE.MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.22,
          metalness: 0.32,
          roughness: 0.2,
          transmission: 0.16,
          transparent: true,
          opacity: 0.78,
        })
      );
      model.position.set(
        (Math.random() - 0.5) * 36,
        -12 + Math.random() * 26,
        -2 - Math.random() * 32
      );
      model.scale.setScalar(0.42 + Math.random() * 1.3);
      model.userData = {
        origin: model.position.clone(),
        phase: Math.random() * Math.PI * 2,
        drift: 0.18 + Math.random() * 0.32,
        spin: (Math.random() - 0.5) * 0.018,
      };
      floatingModels.add(model);
    }
    scene.add(floatingModels);

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
      core.rotation.y += 0.0022;
      core.rotation.x += 0.0007;
      crystal.rotation.y -= 0.003;
      wireframe.rotation.y += 0.004;
      rings.forEach((ring, index) => {
        ring.rotation.z += 0.0014 + index * 0.0007;
        ring.rotation.x += (index % 2 ? -1 : 1) * 0.0008;
      });
      nodes.children.forEach((node) => {
        const ring = rings[node.userData.ringIndex];
        const radius = 3.5 + node.userData.ringIndex * 0.42;
        const angle = node.userData.angle + elapsed * (0.28 + node.userData.ringIndex * 0.08);
        node.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        node.position.applyEuler(ring.rotation);
      });
      floatingModels.children.forEach((model) => {
        const { origin, phase, drift, spin } = model.userData;
        model.position.x = origin.x + Math.sin(elapsed * drift + phase) * 1.4;
        model.position.y = origin.y + Math.cos(elapsed * drift * 1.25 + phase) * 1.1;
        model.position.z = origin.z + Math.sin(elapsed * drift * 0.7 + phase) * 0.8;
        model.rotation.x += spin;
        model.rotation.y += spin * 1.35;
        model.rotation.z += spin * 0.7;
      });
      particles.rotation.y += 0.00025;
      camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.012;
      camera.position.y += (1.5 - pointer.y * 0.9 - camera.position.y) * 0.012;
      camera.lookAt(0, -2.2, 0);
      limeLight.intensity = 16 + Math.sin(elapsed * 1.5) * 3;
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

  return <div ref={containerRef} className="solar-system-canvas atmosphere-canvas" aria-hidden="true" />;
}

export default AtmosphereBackground;
