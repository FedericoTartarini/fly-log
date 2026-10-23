import QRCode from "qrcode";

/**
 * A QR code as one SVG path in module units, so it scales to any size and
 * takes the text colour. Built synchronously from the module matrix, which
 * avoids the library's async canvas and string renderers inside a render.
 *
 * Error correction is the lowest level: the code is shown on a screen, not
 * printed on a scuffed card, and lower correction keeps the modules larger.
 */
export const qrPath = (text: string): { size: number; path: string } => {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "L" });
  const { size, data } = modules;
  let path = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { size, path };
};
