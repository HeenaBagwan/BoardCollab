import { createCanvas } from 'canvas';

/**
 * Render board elements onto a server-side Canvas and return a PNG Buffer
 * @param {Array} elements - Active board elements
 * @param {object} options - Canvas options { width, height, backgroundColor }
 * @returns {Promise<Buffer>}
 */
export async function renderElementsToPng(elements, options = {}) {
  const width = options.width || 1920;
  const height = options.height || 1080;
  const backgroundColor = options.backgroundColor || '#12131a';

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Optional: draw subtle dot grid background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  const gridSpacing = 32;
  for (let x = gridSpacing; x < width; x += gridSpacing) {
    for (let y = gridSpacing; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Render elements in order
  for (const el of elements) {
    const props = el.props || {};

    ctx.save();

    switch (el.type) {
      case 'stroke': {
        const points = props.points || [];
        if (points.length >= 2) {
          ctx.beginPath();
          ctx.strokeStyle = props.stroke || props.color || '#ffffff';
          ctx.lineWidth = props.strokeWidth || 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.moveTo(points[0], points[1]);
          for (let i = 2; i < points.length; i += 2) {
            ctx.lineTo(points[i], points[i + 1]);
          }
          ctx.stroke();
        }
        break;
      }

      case 'rect': {
        const x = props.x || 0;
        const y = props.y || 0;
        const w = props.width || 100;
        const h = props.height || 100;
        const fill = props.fill || 'transparent';
        const stroke = props.stroke || '#ffffff';
        const strokeWidth = props.strokeWidth || 2;
        const radius = props.cornerRadius || 0;

        ctx.beginPath();
        if (radius > 0 && typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, radius);
        } else {
          ctx.rect(x, y, w, h);
        }

        if (fill && fill !== 'transparent') {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke && strokeWidth > 0) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
        break;
      }

      case 'circle': {
        const x = props.x || 0;
        const y = props.y || 0;
        const radius = props.radius || 50;
        const fill = props.fill || 'transparent';
        const stroke = props.stroke || '#ffffff';
        const strokeWidth = props.strokeWidth || 2;

        ctx.beginPath();
        ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);

        if (fill && fill !== 'transparent') {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke && strokeWidth > 0) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
          ctx.stroke();
        }
        break;
      }

      case 'text': {
        const x = props.x || 0;
        const y = props.y || 0;
        const text = props.text || '';
        const fontSize = props.fontSize || 20;
        const fontFamily = props.fontFamily || 'sans-serif';
        const fill = props.fill || '#ffffff';

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = fill;
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
        break;
      }

      default:
        break;
    }

    ctx.restore();
  }

  return canvas.toBuffer('image/png');
}
