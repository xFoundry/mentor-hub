export interface HexCoord {
  q: number;
  r: number;
}

const SQRT_THREE = Math.sqrt(3);

export const HEX_SIZE = 72;
export const HEX_WIDTH = Math.round(SQRT_THREE * HEX_SIZE);
export const HEX_HEIGHT = Math.round(HEX_SIZE * 2);
export const HEX_VERTICAL_SPACING = HEX_SIZE * 1.5;

const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function axialToPixel(coord: HexCoord, size = HEX_SIZE) {
  const width = Math.round(SQRT_THREE * size);
  const originX = width / 2;
  const originY = size;
  return {
    x: width * (coord.q + coord.r / 2) + originX,
    y: size * 1.5 * coord.r + originY,
  };
}

export function pixelToAxial(point: { x: number; y: number }, size = HEX_SIZE) {
  const width = Math.round(SQRT_THREE * size);
  const originX = width / 2;
  const originY = size;
  const shifted = {
    x: point.x - originX,
    y: point.y - originY,
  };
  const r = shifted.y / (size * 1.5);
  const q = shifted.x / width - r / 2;
  return { q, r };
}

export function roundAxial(coord: { q: number; r: number }): HexCoord {
  let x = coord.q;
  let z = coord.r;
  let y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

export function coordKey(coord: HexCoord) {
  return `${coord.q},${coord.r}`;
}

export function coordToPosition(coord: HexCoord, size = HEX_SIZE) {
  const center = axialToPixel(coord, size);
  const width = Math.round(SQRT_THREE * size);
  const height = Math.round(size * 2);
  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
  };
}

export function positionToCoord(position: { x: number; y: number }, size = HEX_SIZE) {
  const width = Math.round(SQRT_THREE * size);
  const height = Math.round(size * 2);
  const center = {
    x: position.x + width / 2,
    y: position.y + height / 2,
  };
  return roundAxial(pixelToAxial(center, size));
}

export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center];

  const results: HexCoord[] = [];
  let current = {
    q: center.q + HEX_DIRECTIONS[4].q * radius,
    r: center.r + HEX_DIRECTIONS[4].r * radius,
  };

  for (let dir = 0; dir < HEX_DIRECTIONS.length; dir += 1) {
    for (let step = 0; step < radius; step += 1) {
      results.push({ ...current });
      current = {
        q: current.q + HEX_DIRECTIONS[dir].q,
        r: current.r + HEX_DIRECTIONS[dir].r,
      };
    }
  }

  return results;
}

export function findOpenCoord(
  occupied: Set<string>,
  anchor: HexCoord,
  maxRing = 12
): HexCoord {
  if (!occupied.has(coordKey(anchor))) {
    return anchor;
  }

  for (let radius = 1; radius <= maxRing; radius += 1) {
    const ring = hexRing(anchor, radius);
    const open = ring.find((coord) => !occupied.has(coordKey(coord)));
    if (open) return open;
  }

  return anchor;
}
