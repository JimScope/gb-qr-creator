import QRCode from "qrcode";

export interface GBPalette {
  name: string;
  bgColor: string;
  fgColor: string;
}

export interface GenerateOptions {
  title: string;
  subtitle: string;
  data: string;                     
  palette: GBPalette;               
  fontUrl: string;                  
  scale?: number;
  padding?: number;
  qrSize?: number;
}

export interface GeneratedQR {
  canvas: HTMLCanvasElement;
  palette: GBPalette;
  exportPNG: () => Promise<Blob>;
  exportBase64: () => string;
  exportImageData: () => ImageData;
}

export const GB_PALETTES: GBPalette[] = [
  { name: "Classic", bgColor: "#9bbc0f", fgColor: "#0f380f" },
  { name: "Pocket", bgColor: "#c4cfa1", fgColor: "#1f1f1f" },
  { name: "Light", bgColor: "#e0f8d0", fgColor: "#081820" },
  { name: "Grayscale", bgColor: "#ffffff", fgColor: "#000000" },
  { name: "BGB", bgColor: "#e0f8cf", fgColor: "#071821" },
];

export async function generateGBQR(options: GenerateOptions): Promise<GeneratedQR> {
  const {
    title,
    subtitle,
    data,
    palette,
    fontUrl,
    scale = 4,
    padding = 4,
    qrSize = 64,
  } = options;

  await loadFont(fontUrl);

  const qrCanvas = await makeQRCanvas(data, qrSize);
  reduceCanvasToPalette(qrCanvas, palette);

  const composed = renderLayout({
    title,
    subtitle,
    palette,
    qrCanvas,
    padding,
  });

  const scaled = scaleCanvas(composed, scale);

  return {
    canvas: scaled,
    palette,
    exportPNG: () => canvasToPNG(scaled),
    exportBase64: () => scaled.toDataURL("image/png"),
    exportImageData: () => {
      const ctx = scaled.getContext("2d")!;
      return ctx.getImageData(0, 0, scaled.width, scaled.height);
    },
  };
}

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------

async function loadFont(url: string) {
  const font = new FontFace("GBFont", `url(${url})`);
  await font.load();
  (document as Document).fonts.add(font);
}

async function makeQRCanvas(data: string, size: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  await QRCode.toCanvas(canvas, data, {
    margin: 0,
    width: size,
    errorCorrectionLevel: "M",
  });

  return canvas;
}

function reduceCanvasToPalette(canvas: HTMLCanvasElement, palette: GBPalette) {
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  const [bgR, bgG, bgB] = hexToRgb(palette.bgColor);
  const [fgR, fgG, fgB] = hexToRgb(palette.fgColor);

  for (let i = 0; i < d.length; i += 4) {
    const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (brightness > 127) {
      d[i] = bgR;
      d[i + 1] = bgG;
      d[i + 2] = bgB;
    } else {
      d[i] = fgR;
      d[i + 1] = fgG;
      d[i + 2] = fgB;
    }
  }

  ctx.putImageData(img, 0, 0);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function renderLayout(input: {
  title: string;
  subtitle: string;
  qrCanvas: HTMLCanvasElement;
  palette: GBPalette;
  padding: number;
}): HTMLCanvasElement {
  const { title, subtitle, qrCanvas, palette, padding } = input;

  // GB Studio standard size: 160x144
  const GB_WIDTH = 160;
  const GB_HEIGHT = 144;

  const canvas = document.createElement("canvas");
  canvas.width = GB_WIDTH;
  canvas.height = GB_HEIGHT;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Fill background
  ctx.fillStyle = palette.bgColor;
  ctx.fillRect(0, 0, GB_WIDTH, GB_HEIGHT);

  // Calculate centered QR position
  const qrSize = qrCanvas.width;
  const qrX = Math.floor((GB_WIDTH - qrSize) / 2);
  const qrY = Math.floor((GB_HEIGHT - qrSize) / 2);

  // Draw QR code centered
  ctx.drawImage(qrCanvas, qrX, qrY);

  // Draw title at top
  ctx.font = "8px GBFont";
  ctx.textAlign = "center";
  ctx.fillStyle = palette.fgColor;
  ctx.fillText(title.toUpperCase(), GB_WIDTH / 2, 12 + padding);

  // Draw subtitle at bottom
  ctx.fillText(subtitle.toUpperCase(), GB_WIDTH / 2, GB_HEIGHT - padding - 4);

  return canvas;
}

function scaleCanvas(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width * scale;
  out.height = src.height * scale;

  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);

  return out;
}

function canvasToPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => canvas.toBlob(blob => resolve(blob!), "image/png"));
}
