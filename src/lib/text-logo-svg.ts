// テキストロゴの SVG を組み立てる処理。
//
// 下から順に重ねる：
//   1. 背景         … 透明、または指定した色の四角
//   2. 影           … 文字（縁取りを含む）と同じ形を、ずらしたり・ぼかしたりして敷く
//   3. 外側の縁取り … 二重の縁取りのときだけ
//   4. 内側の縁取り
//   5. 文字
//   6. ツヤ         … 文字の上半分に白い光をのせる（文字の形で切り抜く）
//
// 縁取りは「文字の形を太い線でなぞって、その上に文字を重ねる」方法で描く。
// 線は文字の輪郭の内と外に半分ずつはみ出すので、外に見える太さの2倍の線で描いている。
//
// 座標の単位は「文字の大きさを size としたときの px」。PNG で保存するときは、この大きさ × 倍率になる。
import type { Font } from 'opentype.js';
import { layoutLine, referenceBox, commandsToD } from './text-path';
import { escapeXml } from './badge-svg';

export { needsFallback } from './text-path';

export interface Outline {
  color: string;
  /** 文字の外側に見える太さ（px） */
  width: number;
}

export interface Shadow {
  /** hard：くっきりずらした影、soft：ぼかした影 */
  type: 'hard' | 'soft';
  color: string;
  /** 右下方向へのずれ（px）。横と縦に同じだけずらす */
  offset: number;
  /** ぼかしの強さ（px）。soft のときだけ使う */
  blur: number;
}

export interface TextLogoOptions {
  text: string;
  font: Font;
  /** 選んだフォントにない文字を描くフォント */
  fallback?: Font;
  /** 文字の大きさ（px） */
  size: number;
  /** 文字間（文字の大きさに対する割合。0 で標準） */
  tracking: number;
  /** 行間（文字の大きさの何倍で次の行に進むか） */
  lineHeight: number;
  align: 'left' | 'center' | 'right';
  color: string;
  /** 縁取り。二重にするときは 2 つ目（外側）も指定する */
  outline?: Outline;
  outline2?: Outline;
  shadow?: Shadow;
  /** ツヤをのせるか */
  gloss: boolean;
  /** 背景色。なしなら透明 */
  background?: string;
  /** 文字のまわりの余白（px） */
  padding: number;
  idPrefix?: string;
}

export interface TextLogoResult {
  svg: string;
  /** 画像の幅・高さ（px） */
  width: number;
  height: number;
  /** どのフォントにも入っていない文字 */
  missing: string[];
}

const n = (v: number) => Math.round(v * 100) / 100;

export function renderTextLogoSvg(o: TextLogoOptions): TextLogoResult {
  const prefix = o.idPrefix ?? 'logo';
  const id = { text: `${prefix}-text`, clip: `${prefix}-clip`, gloss: `${prefix}-gloss`, blur: `${prefix}-blur` };
  const missing = new Set<string>();

  // ---------- 1行ずつ並べる ----------
  const lines = o.text.replace(/\r/g, '').split('\n');
  const laid = lines.map((line) => layoutLine(line, o.font, o.fallback, o.tracking, missing));
  const maxWidth = Math.max(0, ...laid.map((l) => l.width)) * o.size;
  // 行の上下の位置の基準（漢字・かなが入っていれば「国」、なければ「H」の高さ）
  const ref = referenceBox(o.text, o.font, o.fallback);
  const step = o.lineHeight * o.size; // 1行ごとに下へ進む量

  let d = '';
  // 実際に描いた文字の、上下左右のはし
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  // ツヤをのせる範囲（行ごと）
  const glossRects: { x: number; y: number; w: number; h: number }[] = [];

  laid.forEach((l, i) => {
    const baseline = i * step;
    const lineWidth = l.width * o.size;
    const left = o.align === 'left' ? 0 : o.align === 'right' ? maxWidth - lineWidth : (maxWidth - lineWidth) / 2;
    for (const g of l.glyphs) {
      const path = g.glyph.getPath(0, 0, o.size);
      const gx = left + g.x * o.size;
      d += commandsToD(path.commands, (x, y) => [gx + x, baseline + y]);
      const b = path.getBoundingBox();
      if (b.x2 > b.x1) {
        box.x1 = Math.min(box.x1, gx + b.x1);
        box.x2 = Math.max(box.x2, gx + b.x2);
        box.y1 = Math.min(box.y1, baseline + b.y1);
        box.y2 = Math.max(box.y2, baseline + b.y2);
      }
    }
    if (l.glyphs.length) {
      // 文字の上端から、高さの半分より少し下までを光らせる
      const top = baseline + ref.top * o.size;
      glossRects.push({ x: left, y: top - o.size * 0.1, w: lineWidth, h: ref.height * o.size * 0.55 + o.size * 0.1 });
    }
  });

  // 文字がひとつもないときは、何も描かれていない小さな画像にする
  if (!isFinite(box.x1)) {
    box.x1 = 0;
    box.y1 = -o.size * 0.8;
    box.x2 = o.size * 2;
    box.y2 = 0;
  }

  // ---------- 縁取りと影で、絵が文字より広がる分を足して画像の大きさを決める ----------
  const t1 = o.outline?.width ?? 0;
  const t2 = o.outline ? (o.outline2?.width ?? 0) : 0;
  const reach = t1 + t2; // 文字の輪郭から外へ広がる太さ
  const s = o.shadow;
  const shadowSpread = s ? (s.type === 'soft' ? s.blur * 2.5 : 0) : 0;
  const pad = o.padding;
  const minX = box.x1 - reach - pad - (s ? Math.max(0, shadowSpread - s.offset) : 0);
  const minY = box.y1 - reach - pad - (s ? Math.max(0, shadowSpread - s.offset) : 0);
  const maxX = box.x2 + reach + pad + (s ? s.offset + shadowSpread : 0);
  const maxY = box.y2 + reach + pad + (s ? s.offset + shadowSpread : 0);
  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);

  // ---------- 重ねる ----------
  // 同じ文字の形を何度も使うので、<defs> に1回だけ書いて <use> で呼び出す（ファイルが軽くなる）。
  // 古いグラフィックソフト向けに xlink:href も書いておく
  const use = (attrs: string) => `<use href="#${id.text}" xlink:href="#${id.text}" ${attrs}/>`;
  const stroke = (color: string, w: number) =>
    use(`fill="${color}" stroke="${color}" stroke-width="${n(w * 2)}" stroke-linejoin="round"`);

  const layers: string[] = [];
  const defs: string[] = [`<path id="${id.text}" d="${d}"/>`];

  if (o.background) {
    layers.push(`<rect x="${n(minX)}" y="${n(minY)}" width="${width}" height="${height}" fill="${o.background}"/>`);
  }
  if (s && d) {
    // 影：縁取りまで含めた形（いちばん外側の太さでなぞった形）を、右下にずらして敷く
    const silhouette = reach > 0 ? stroke(s.color, reach) : use(`fill="${s.color}"`);
    if (s.type === 'soft') {
      // feGaussianBlur：形をぼかす SVG のフィルター。filter の範囲を広めにして、ぼかしが切れないようにする
      defs.push(
        `<filter id="${id.blur}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${n(s.blur)}"/></filter>`,
      );
      layers.push(`<g transform="translate(${s.offset} ${s.offset})" filter="url(#${id.blur})" opacity="0.6">${silhouette}</g>`);
    } else {
      layers.push(`<g transform="translate(${s.offset} ${s.offset})">${silhouette}</g>`);
    }
  }
  if (o.outline && t2 > 0) layers.push(stroke(o.outline2!.color, t1 + t2));
  if (o.outline && t1 > 0) layers.push(stroke(o.outline.color, t1));
  layers.push(use(`fill="${o.color}"`));

  if (o.gloss && d) {
    // ツヤ：上が白、下が透明のグラデーションの四角を、文字の形で切り抜いてのせる
    defs.push(
      `<clipPath id="${id.clip}">${use('')}</clipPath>`,
      `<linearGradient id="${id.gloss}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.15"/>
    </linearGradient>`,
    );
    const rects = glossRects
      .map((r) => `<rect x="${n(r.x - o.size)}" y="${n(r.y)}" width="${n(r.w + o.size * 2)}" height="${n(r.h)}" fill="url(#${id.gloss})"/>`)
      .join('');
    layers.push(`<g clip-path="url(#${id.clip})">${rects}</g>`);
  }

  const title = o.text.replace(/\s+/g, ' ').trim() || 'ロゴ';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${n(minX)} ${n(minY)} ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <defs>
    ${defs.join('\n    ')}
  </defs>
  ${layers.join('\n  ')}
</svg>
`;
  return { svg, width, height, missing: [...missing] };
}
