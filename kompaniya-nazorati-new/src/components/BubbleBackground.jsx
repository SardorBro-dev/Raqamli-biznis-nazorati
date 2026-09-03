import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getCurrentUser } from "../utils/storage";
import { authApi } from "../services/api";

const MODE_PREFIX = "app_background_mode_";
const BUBBLES_MODE = "bubbles";
const BUBBLE_COUNT = 28;

function getMode(userId) {
  return userId ? localStorage.getItem(`${MODE_PREFIX}${userId}`) || "" : "";
}

function BubbleBackground({ preview = false }) {
  const containerRef = useRef(null);
  const [mode, setMode] = useState(() => getMode(getCurrentUser()?.id));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const active = preview || (!settingsOpen && mode === BUBBLES_MODE);

  useEffect(() => {
    if (preview) return undefined;
    const onBackgroundChange = (event) => setMode(event.detail?.type === BUBBLES_MODE ? BUBBLES_MODE : "");
    const onSessionChange = (event) => setMode(getMode(event.detail?.userId || event.detail?.user?.id));
    const onSettingsChange = (event) => setSettingsOpen(Boolean(event.detail?.open));
    window.addEventListener("app-background-change", onBackgroundChange);
    window.addEventListener("app-session-change", onSessionChange);
    window.addEventListener("app-background-settings", onSettingsChange);
    const session = getCurrentUser();
    const token = JSON.parse(localStorage.getItem("authSession") || "null")?.token;
    if (session?.id && token) {
      authApi.getBackgroundMode(token).then(({ mode: savedMode }) => {
        const localMode = getMode(session.id);
        const mode = savedMode || localMode;
        if (!savedMode && localMode) authApi.setBackgroundMode(localMode, token).catch(() => {});
        setMode(mode);
        localStorage.setItem(`${MODE_PREFIX}${session.id}`, mode);
      }).catch(() => {});
    }
    return () => {
      window.removeEventListener("app-background-change", onBackgroundChange);
      window.removeEventListener("app-session-change", onSessionChange);
      window.removeEventListener("app-background-settings", onSettingsChange);
    };
  }, [preview]);

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 14;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x021a3b, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0x78bfff, 1.8));
    const light = new THREE.PointLight(0x4ab8ff, 3, 24);
    light.position.set(0, 1, 6);
    scene.add(light);

    const bubbleGeometry = new THREE.SphereGeometry(0.36, 24, 18);
    const bubbles = [];
    const createBubble = (index) => {
      const size = 0.18 + Math.random() * 0.46;
      const material = new THREE.MeshPhysicalMaterial({ color: 0x54bfff, roughness: 0.05, metalness: 0.02, transmission: 0.7, transparent: true, opacity: 0.62, clearcoat: 1, clearcoatRoughness: 0.08 });
      const bubble = new THREE.Mesh(bubbleGeometry, material);
      bubble.position.set((Math.random() - 0.5) * 15, -5 + Math.random() * 10, (Math.random() - 0.5) * 5);
      bubble.scale.setScalar(size / 0.36);
      bubble.userData = { speed: 0.18 + Math.random() * 0.35, drift: Math.random() * 2, phase: Math.random() * Math.PI * 2, radius: size, index };
      scene.add(bubble);
      bubbles.push(bubble);
    };
    for (let index = 0; index < BUBBLE_COUNT; index += 1) createBubble(index);

    const burstGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    const bursts = [];
    const popBubble = (bubble, time) => {
      const burstColor = bubble.material.color.clone();
      for (let index = 0; index < 9; index += 1) {
        const material = new THREE.MeshBasicMaterial({ color: burstColor, transparent: true, opacity: 0.9 });
        const particle = new THREE.Mesh(burstGeometry, material);
        particle.position.copy(bubble.position);
        particle.userData = { born: time, velocity: new THREE.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.05) };
        scene.add(particle);
        bursts.push(particle);
      }
      bubble.position.set((Math.random() - 0.5) * 15, -5.5 - Math.random() * 2, (Math.random() - 0.5) * 5);
      bubble.material.opacity = 0.62;
    };

    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const onPointerDown = (event) => {
      const rect = container.getBoundingClientRect();
      const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(bubbles)[0];
      if (hit) popBubble(hit.object, performance.now());
    };
    const animate = (time) => {
      bubbles.forEach((bubble) => {
        bubble.position.y += bubble.userData.speed * 0.01;
        bubble.position.x += Math.sin(time * 0.001 * bubble.userData.drift + bubble.userData.phase) * 0.0015;
        bubble.rotation.y += 0.004;
        if (bubble.position.y > 6) bubble.position.y = -6;
      });
      for (let index = bursts.length - 1; index >= 0; index -= 1) {
        const burst = bursts[index];
        const age = (time - burst.userData.born) / 1000;
        burst.position.add(burst.userData.velocity);
        burst.scale.multiplyScalar(0.97);
        burst.material.opacity = Math.max(0, 0.9 - age * 1.8);
        if (age > 0.55) {
          scene.remove(burst);
          burst.material.dispose();
          bursts.splice(index, 1);
        }
      }
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onPointerDown);
    let frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
      bubbles.forEach((bubble) => bubble.material.dispose());
      bursts.forEach((burst) => burst.material.dispose());
      bubbleGeometry.dispose();
      burstGeometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [active]);

  if (!active) return null;
  return <div ref={containerRef} className={`bubble-background${preview ? " bubble-background-preview" : ""}`} aria-hidden="true" />;
}

export default BubbleBackground;
