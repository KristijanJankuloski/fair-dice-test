import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { DieGeometry } from '../services/die/geometry';
import type { Layout } from '../services/die/layout';
import type { Vec3 } from '../services/die/vec';

interface Props {
  geometry: DieGeometry;
  layout: Layout;
  /** label → css colour */
  colors: Record<number, string>;
  arrow: Vec3 | null;
  selectedLabel: number | null;
  resetSignal: number;
  onPick: (label: number) => void;
  onUnavailable: () => void;
}

const v3 = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);

function labelTexture(text: string, highlighted: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.font = 'bold 84px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 14;
  g.strokeStyle = highlighted ? '#1d4ed8' : '#0f172a';
  g.strokeText(text, 64, 68);
  g.fillStyle = '#ffffff';
  g.fillText(text, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Rotatable die. Rendering is on demand (no animation loop), so it costs nothing while idle. */
export default function Die3D({ geometry, layout, colors, arrow, selectedLabel, resetSignal, onPick, onUnavailable }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const three = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    root: THREE.Group;
    model: THREE.Group | null;
    render: () => void;
  } | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const rotation = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, -0.6, 0)));

  // Renderer, camera, drag handling: once per mount.
  useEffect(() => {
    const el = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
    light.position.set(2, 3, 4);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.6);
    const root = new THREE.Group();
    scene.add(root);

    const render = () => {
      root.quaternion.copy(rotation.current);
      renderer.render(scene, camera);
    };
    const resize = () => {
      const w = el.clientWidth || 320;
      const h = Math.min(360, Math.max(240, w * 0.75));
      renderer.setSize(w, h, true);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(el);

    // Drag to rotate; a press without movement is a click that picks a face.
    let last: { x: number; y: number } | null = null;
    let moved = 0;
    const canvas = renderer.domElement;
    const down = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      moved = 0;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!last) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      last = { x: e.clientX, y: e.clientY };
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.01, dx * 0.01, 0));
      rotation.current.premultiply(q).normalize();
      render();
    };
    const up = (e: PointerEvent) => {
      if (last && moved < 5) {
        const rect = canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(root.children, true).find((h) => h.object.userData.label !== undefined);
        if (hit) pickRef.current(hit.object.userData.label as number);
      }
      last = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);

    three.current = { renderer, scene, camera, root, model: null, render };
    return () => {
      ro?.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      renderer.dispose();
      canvas.remove();
      three.current = null;
    };
  }, [onUnavailable]);

  useEffect(() => {
    rotation.current.setFromEuler(new THREE.Euler(0.5, -0.6, 0));
    three.current?.render();
  }, [resetSignal]);

  // Model: rebuilt when data/layout/selection change (≤ 20 faces, cheap). Rotation is kept.
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    if (t.model) {
      t.root.remove(t.model);
      t.model.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
          (x as THREE.SpriteMaterial).map?.dispose();
          x.dispose();
        });
      });
    }
    const model = new THREE.Group();
    const g = geometry;

    // Body faces (fan-triangulated polygons).
    g.faces.forEach((poly, slot) => {
      const label = layout[slot];
      const pos: number[] = [];
      for (let i = 1; i < poly.length - 1; i++) {
        for (const idx of [poly[0], poly[i], poly[i + 1]]) pos.push(...g.vertices[idx]);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const colour = g.kind === 'face' ? colors[label] : '#475569';
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colour, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05, flatShading: true }));
      if (g.kind === 'face') mesh.userData.label = label;
      model.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: 0x0f172a }));
      model.add(edges);
    });

    // D4: coloured markers at the vertices (the result is the vertex pointing up).
    if (g.kind === 'vertex') {
      g.slotDirections.forEach((_, slot) => {
        const label = layout[slot];
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: colors[label] }));
        ball.position.copy(v3(g.vertices[slot]));
        ball.userData.label = label;
        model.add(ball);
      });
    }

    // Number labels.
    g.slotAnchors.forEach((anchor, slot) => {
      const label = layout[slot];
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(String(label), label === selectedLabel) }));
      sprite.position.copy(v3(anchor));
      const size = g.sides >= 12 ? 0.3 : 0.42;
      sprite.scale.set(size, size, 1);
      sprite.userData.label = label;
      model.add(sprite);
    });

    // Estimated weight direction: dashed shaft + head, drawn on top so it shows through the die.
    if (arrow) {
      const dir = v3(arrow).normalize();
      const len = 1.7;
      const shaft = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(len)]);
      const line = new THREE.Line(shaft, new THREE.LineDashedMaterial({ color: 0xfbbf24, dashSize: 0.12, gapSize: 0.08, depthTest: false }));
      line.computeLineDistances();
      line.renderOrder = 10;
      model.add(line);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24, depthTest: false }));
      head.position.copy(dir.clone().multiplyScalar(len));
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      head.renderOrder = 11;
      model.add(head);
    }

    t.root.add(model);
    t.model = model;
    t.render();
  }, [geometry, layout, colors, arrow, selectedLabel]);

  return <div ref={mount} className="w-full" data-testid="die-canvas" />;
}
