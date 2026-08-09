import { markColor, markInitials } from "@/lib/company-mark";

/*
  Pins are pictures, not DOM nodes.

  Each company gets one small image drawn on a canvas and handed to MapLibre
  with addImage. After that the GPU draws every pin in a single pass, so
  panning stays smooth with hundreds of them on screen. The alternative —
  an HTML marker per company — costs a layout pass on every frame of a drag.

  Everything here is measured in CSS pixels and scaled by `ratio` at draw time,
  so the same code produces a crisp sprite on a 1x monitor and a 3x phone.
*/

export const TILE_SIZE = 34;
export const TILE_RADIUS = 10;
/* Room around the tile for its drop shadow. */
const TILE_PAD = 5;
/* The ring and its glow need more room than the tile itself. */
const RING_BOX = 60;

const INK = "#211e1a";
const PAPER = "#faf7f0";

export type StretchSprite = {
  data: ImageData;
  options: {
    pixelRatio: number;
    stretchX: [number, number][];
    stretchY: [number, number][];
    content: [number, number, number, number];
  };
};

/* The white card with the company's logo — or its initials when there is no logo. */
export function drawCompanyTile(
  name: string,
  seed: string,
  logo: HTMLImageElement | null,
  ratio: number,
): ImageData {
  const box = TILE_SIZE + TILE_PAD * 2;
  const { canvas, context } = createCanvas(box, ratio);

  context.shadowColor = "rgba(33, 30, 26, 0.22)";
  context.shadowBlur = 4;
  context.shadowOffsetY = 1.5;
  context.fillStyle = "#ffffff";
  roundedRect(context, TILE_PAD, TILE_PAD, TILE_SIZE, TILE_SIZE, TILE_RADIUS);
  context.fill();
  clearShadow(context);

  const inset = 3;
  const inner = TILE_SIZE - inset * 2;
  context.save();
  roundedRect(context, TILE_PAD + inset, TILE_PAD + inset, inner, inner, TILE_RADIUS - inset);
  context.clip();

  if (logo) {
    // Cover, not stretch — a squashed logo looks worse than a cropped one.
    const scale = Math.max(inner / logo.naturalWidth, inner / logo.naturalHeight);
    const width = logo.naturalWidth * scale;
    const height = logo.naturalHeight * scale;
    context.drawImage(
      logo,
      TILE_PAD + inset + (inner - width) / 2,
      TILE_PAD + inset + (inner - height) / 2,
      width,
      height,
    );
  } else {
    context.fillStyle = markColor(seed);
    context.fillRect(TILE_PAD, TILE_PAD, TILE_SIZE, TILE_SIZE);
    context.fillStyle = "#ffffff";
    context.font = `600 ${inner * 0.52}px "Inter Variable", system-ui, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    // Optical centre sits a hair above the geometric one for capital letters.
    context.fillText(markInitials(name), TILE_PAD + TILE_SIZE / 2, TILE_PAD + TILE_SIZE / 2 + 0.5);
  }
  context.restore();

  // A hairline keeps a white logo on a white card from dissolving into the map.
  context.strokeStyle = "rgba(33, 30, 26, 0.12)";
  context.lineWidth = 1;
  roundedRect(context, TILE_PAD + 0.5, TILE_PAD + 0.5, TILE_SIZE - 1, TILE_SIZE - 1, TILE_RADIUS);
  context.stroke();

  return read(context, canvas);
}

/*
  The coloured ring that sits under a tile and says what state it is in:
  peepal for hiring, stone for quiet, marigold for the open company.
  Drawn once per state and shared by every pin — three images, not three per company.
*/
export function drawStateRing(color: string, glow: string | null, ratio: number): ImageData {
  const { canvas, context } = createCanvas(RING_BOX, ratio);
  const centre = RING_BOX / 2;
  const size = TILE_SIZE + 6;
  const origin = centre - size / 2;

  if (glow) {
    context.shadowColor = glow;
    context.shadowBlur = 11;
    context.fillStyle = glow;
    roundedRect(context, origin, origin, size, size, TILE_RADIUS + 3);
    context.fill();
    // Painted twice because one pass of canvas blur reads too faint against paper.
    context.fill();
    clearShadow(context);
  }

  context.fillStyle = color;
  roundedRect(context, origin, origin, size, size, TILE_RADIUS + 3);
  context.fill();

  return read(context, canvas);
}

/*
  The white name plate under each pin. It is a stretchable image: MapLibre
  keeps the rounded caps intact and stretches only the flat middle, so one
  image labels "Ola" and "The/nudge Institute" alike.

  The corner radius stays just under half the height on purpose. At exactly
  half there is no flat band left to stretch, and MapLibre renders nothing.
*/
export function drawLabelPill(ratio: number): StretchSprite {
  const width = 32;
  const height = 26;
  const pad = 4;
  const pillHeight = height - pad * 2;
  const radius = pillHeight / 2 - 1;
  const { canvas, context } = createCanvas(width, ratio, height);

  context.shadowColor = "rgba(33, 30, 26, 0.18)";
  context.shadowBlur = 3;
  context.shadowOffsetY = 1;
  context.fillStyle = "#ffffff";
  roundedRect(context, pad, pad, width - pad * 2, pillHeight, radius);
  context.fill();
  clearShadow(context);

  context.strokeStyle = "rgba(33, 30, 26, 0.08)";
  context.lineWidth = 1;
  roundedRect(context, pad + 0.5, pad + 0.5, width - pad * 2 - 1, pillHeight - 1, radius);
  context.stroke();

  return {
    data: read(context, canvas),
    options: {
      pixelRatio: ratio,
      // Stretch only between the rounded ends, never through them.
      stretchX: [[(pad + radius) * ratio, (width - pad - radius) * ratio]],
      stretchY: [[(pad + radius) * ratio, (height - pad - radius) * ratio]],
      content: [
        (pad + 5) * ratio,
        (pad + 3) * ratio,
        (width - pad - 5) * ratio,
        (height - pad - 3) * ratio,
      ],
    },
  };
}

/* Same trick as the name plate, in ink, for the "how many are stacked here" chip. */
export function drawCountChip(ratio: number): StretchSprite {
  const width = 34;
  const height = 28;
  const pad = 5;
  const chipHeight = height - pad * 2;
  const radius = chipHeight / 2 - 1;
  const { canvas, context } = createCanvas(width, ratio, height);

  context.shadowColor = "rgba(27, 127, 77, 0.35)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 2;
  context.fillStyle = "#1b7f4d";
  roundedRect(context, pad, pad, width - pad * 2, chipHeight, radius);
  context.fill();
  clearShadow(context);

  context.strokeStyle = PAPER;
  context.lineWidth = 2;
  roundedRect(context, pad + 1, pad + 1, width - pad * 2 - 2, chipHeight - 2, radius);
  context.stroke();

  return {
    data: read(context, canvas),
    options: {
      pixelRatio: ratio,
      stretchX: [[(pad + radius) * ratio, (width - pad - radius) * ratio]],
      stretchY: [[(pad + radius) * ratio, (height - pad - radius) * ratio]],
      content: [
        (pad + 6) * ratio,
        (pad + 3) * ratio,
        (width - pad - 6) * ratio,
        (height - pad - 3) * ratio,
      ],
    },
  };
}

/* A single dot for the "you are here" marker — the marigold dot from BRAND §1. */
export function drawHerePin(ratio: number): ImageData {
  const box = 26;
  const { canvas, context } = createCanvas(box, ratio);
  const centre = box / 2;

  context.shadowColor = "rgba(33, 30, 26, 0.28)";
  context.shadowBlur = 5;
  context.shadowOffsetY = 1;
  context.fillStyle = PAPER;
  circle(context, centre, centre, 8);
  context.fill();
  clearShadow(context);

  context.fillStyle = "#f5b301";
  circle(context, centre, centre, 5);
  context.fill();

  context.strokeStyle = INK;
  context.lineWidth = 1;
  circle(context, centre, centre, 8);
  context.stroke();

  return read(context, canvas);
}

/*
  Logos load over the network and some will 404. Resolving to null instead of
  rejecting means one dead URL costs that company its initials, not the map.
*/
export function loadLogo(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

// --- canvas helpers ----------------------------------------------------

function createCanvas(width: number, ratio: number, height = width) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser refused a 2D canvas.");
  context.scale(ratio, ratio);
  return { canvas, context };
}

function read(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): ImageData {
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
}

function clearShadow(context: CanvasRenderingContext2D) {
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
}
