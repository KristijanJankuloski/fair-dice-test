import type { DiceType } from '../../types/dice';
import { add, cross, dot, length, mean, normalize, scale, sub, type Vec3 } from './vec';

/**
 * Pure polyhedron data for each die (no three.js). A "slot" is a position on the die that
 * carries one number. For D6-D20 a slot is a face; for the D4 a slot is a vertex, because the
 * D4's result is the vertex that points up.
 */
export interface DieGeometry {
  sides: DiceType;
  vertices: Vec3[];
  /** Polygons as vertex-index lists, counter-clockwise seen from outside. */
  faces: number[][];
  kind: 'face' | 'vertex';
  /** Per slot: the unit direction that points up when that slot's number is the result. */
  slotDirections: Vec3[];
  /** Per slot: where its number label is drawn. */
  slotAnchors: Vec3[];
}

const PHI = (1 + Math.sqrt(5)) / 2;
const EPS = 1e-6;

const signs = [-1, 1];

function cyclic(a: number, b: number, c: number): Vec3[] {
  return [
    [a, b, c],
    [c, a, b],
    [b, c, a],
  ];
}

/** Build polygons from a vertex set and the outward face normals (one polygon per normal). */
function facesFromNormals(vertices: Vec3[], normals: Vec3[]): number[][] {
  return normals.map((n) => {
    const max = Math.max(...vertices.map((v) => dot(v, n)));
    const idx = vertices.map((_, i) => i).filter((i) => dot(vertices[i], n) > max - EPS);
    const c = mean(idx.map((i) => vertices[i]));
    const ref = sub(vertices[idx[0]], c);
    const u = normalize(ref);
    const w = cross(n, u);
    const angle = (i: number) => {
      const d = sub(vertices[i], c);
      return Math.atan2(dot(d, w), dot(d, u));
    };
    return idx.sort((a, b) => angle(a) - angle(b));
  });
}

function faceNormal(vertices: Vec3[], face: number[]): Vec3 {
  // Newell's method, robust for any planar polygon.
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < face.length; i++) {
    const a = vertices[face[i]];
    const b = vertices[face[(i + 1) % face.length]];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return normalize([nx, ny, nz]);
}

function normaliseSize(vertices: Vec3[]): Vec3[] {
  const r = Math.max(...vertices.map(length));
  return vertices.map((v) => scale(v, 1 / r));
}

function fromPolygons(sides: DiceType, rawVertices: Vec3[], faces: number[][]): DieGeometry {
  const vertices = normaliseSize(rawVertices);
  const slotDirections = faces.map((f) => faceNormal(vertices, f));
  const slotAnchors = faces.map((f, i) => add(mean(f.map((v) => vertices[v])), scale(slotDirections[i], 0.07)));
  return { sides, vertices, faces, kind: 'face', slotDirections, slotAnchors };
}

function tetrahedron(): DieGeometry {
  const raw: Vec3[] = [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ];
  const vertices = normaliseSize(raw);
  const faces = facesFromNormals(vertices, vertices.map((v) => scale(v, -1)));
  return {
    sides: 4,
    vertices,
    faces,
    kind: 'vertex',
    slotDirections: vertices.map((v) => normalize(v)),
    slotAnchors: vertices.map((v) => scale(v, 1.15)),
  };
}

function cube(): DieGeometry {
  const vertices: Vec3[] = [];
  for (const x of signs) for (const y of signs) for (const z of signs) vertices.push([x, y, z]);
  const normals: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  return fromPolygons(6, vertices, facesFromNormals(vertices, normals));
}

function octahedron(): DieGeometry {
  const vertices: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const normals: Vec3[] = [];
  for (const x of signs) for (const y of signs) for (const z of signs) normals.push(normalize([x, y, z]));
  return fromPolygons(8, vertices, facesFromNormals(vertices, normals));
}

const icosahedronVertices = (): Vec3[] => {
  const v: Vec3[] = [];
  for (const s1 of signs) for (const s2 of signs) v.push(...cyclic(0, s1, s2 * PHI));
  return v;
};

/** Directions of the 20 icosahedron face centres (= dodecahedron vertex directions). */
function icosahedronFaceCentres(ico: Vec3[]): Vec3[] {
  let edge = Infinity;
  for (let i = 1; i < ico.length; i++) edge = Math.min(edge, length(sub(ico[0], ico[i])));
  const near = (a: number, b: number) => Math.abs(length(sub(ico[a], ico[b])) - edge) < EPS;
  const centres: Vec3[] = [];
  for (let a = 0; a < ico.length; a++)
    for (let b = a + 1; b < ico.length; b++)
      for (let c = b + 1; c < ico.length; c++)
        if (near(a, b) && near(b, c) && near(a, c)) centres.push(normalize(mean([ico[a], ico[b], ico[c]])));
  return centres;
}

// The dodecahedron is built as the dual of the icosahedron so the two orientations always agree.
function dodecahedron(): DieGeometry {
  const ico = icosahedronVertices();
  const vertices = icosahedronFaceCentres(ico);
  const normals = ico.map(normalize);
  return fromPolygons(12, vertices, facesFromNormals(vertices, normals));
}

function icosahedron(): DieGeometry {
  const vertices = icosahedronVertices();
  const normals = icosahedronFaceCentres(vertices);
  return fromPolygons(20, vertices, facesFromNormals(vertices, normals));
}

/** Pentagonal trapezohedron: 10 planar kite faces, two cones of five. */
function trapezohedron(): DieGeometry {
  const c = 0.105; // ring height; the apex height is solved so each kite is planar
  const ring = (k: number, z: number, offset: number): Vec3 => {
    const a = ((72 * k + offset) * Math.PI) / 180;
    return [Math.cos(a), Math.sin(a), z];
  };
  const U0 = ring(0, c, 0);
  const U1 = ring(1, c, 0);
  const L0 = ring(0, -c, 36);
  const n = cross(sub(U1, U0), sub(L0, U0));
  const apex = c + n[0] / n[2];

  const vertices: Vec3[] = [[0, 0, apex], [0, 0, -apex]]; // 0 = top, 1 = bottom
  const U = (k: number) => 2 + (k % 5); // upper ring 2..6
  const L = (k: number) => 7 + (k % 5); // lower ring 7..11
  for (let k = 0; k < 5; k++) vertices.push(ring(k, c, 0));
  for (let k = 0; k < 5; k++) vertices.push(ring(k, -c, 36));

  const faces: number[][] = [];
  for (let k = 0; k < 5; k++) faces.push([0, U(k), L(k), U(k + 1)]); // upper kites
  for (let k = 0; k < 5; k++) faces.push([1, L(k + 1), U(k + 1), L(k)]); // lower kites

  // Make sure each polygon winds counter-clockwise seen from outside.
  const fixed = faces.map((f) => {
    const centre = mean(f.map((i) => vertices[i]));
    return dot(faceNormal(vertices, f), centre) >= 0 ? f : [...f].reverse();
  });
  return fromPolygons(10, vertices, fixed);
}

const cache = new Map<DiceType, DieGeometry>();

export function getDieGeometry(sides: DiceType): DieGeometry {
  let g = cache.get(sides);
  if (!g) {
    g = { 4: tetrahedron, 6: cube, 8: octahedron, 10: trapezohedron, 12: dodecahedron, 20: icosahedron }[sides]();
    cache.set(sides, g);
  }
  return g;
}

/** Slot index opposite to `slot` (anti-parallel direction), or null (D4 has none). */
export function oppositeSlot(g: DieGeometry, slot: number): number | null {
  if (g.kind === 'vertex') return null;
  const d = g.slotDirections[slot];
  const i = g.slotDirections.findIndex((o, idx) => idx !== slot && dot(o, d) < -0.999);
  return i === -1 ? null : i;
}
