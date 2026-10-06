// グロッシー丸バッジの SVG を「文字列」として組み立てる関数。
// 画面表示用のコンポーネント（GlossyBadge.astro）と、配布用ファイルの生成（.svg / .png）の
// 両方から同じ関数を呼ぶことで、見た目が必ず一致するようにしている。
//
// 下から順に重ねる4レイヤー構造：
//   1. 縁（リム）     … ベース色を暗くした円。輪郭をくっきりさせる
//   2. 色面           … radialGradient。光が左上から当たっているように見せる
//   3. 内側の影       … 中心は透明・外周だけ暗い radialGradient。縁を締めて立体感を出す
//   (モチーフ)        … 星やハート、文字など。色面の上・ハイライトの下に置く
//   4. ハイライト     … 上部の半透明の楕円。白→透明のグラデーションで「ツヤ」を出す
import { lighten, darken } from './color';

export type Motif = 'star' | 'heart' | 'none';

export interface BadgeOptions {
  /** ベース色（#rrggbb） */
  color?: string;
  /** 中央のモチーフ */
  motif?: Motif;
  /** モチーフの代わりに表示する文字（1〜2文字くらいが目安） */
  text?: string;
  /** width / height 属性（px）。省略すると viewBox だけになり、置いた場所の大きさに合わせて伸縮する */
  size?: number;
  /** 読み上げ用の説明。SVG ファイルでは <title> にもなる */
  title?: string;
  /** ハイライト楕円の位置・大きさ・濃さ */
  highlight?: { cx?: number; cy?: number; rx?: number; ry?: number; opacity?: number };
  /**
   * グラデーションの id に付ける接頭辞。
   * 同じページにバッジを複数置くと id が重複して、全部が最初のバッジの色で塗られてしまうため、
   * バッジごとに違う値を渡す。
   */
  idPrefix?: string;
}

/** 中心(cx, cy)の5角星のパス。外側半径 r1、内側半径 r2 */
function starPath(cx: number, cy: number, r1: number, r2: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? r1 : r2;
    const a = -Math.PI / 2 + (i * Math.PI) / 5; // 真上から時計回り
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

const MOTIF_PATHS: Record<Motif, string | null> = {
  star: starPath(50, 53, 22, 9.5),
  heart: 'M50 70 C30 56 28 38 41 37 C46 37 50 41 50 45 C50 41 54 37 59 37 C72 38 70 56 50 70 Z',
  none: null,
};

/** 文字列を SVG/HTML に埋め込んでも壊れないようにする */
function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function renderBadgeSvg({
  color = '#3a8ee6',
  motif = 'star',
  text,
  size,
  title = 'バッジ',
  highlight = {},
  idPrefix = 'gb',
}: BadgeOptions = {}): string {
  const hl = { cx: 50, cy: 30, rx: 32, ry: 19, opacity: 0.9, ...highlight };
  const id = { base: `${idPrefix}-base`, shade: `${idPrefix}-shade`, shine: `${idPrefix}-shine` };

  const rim = darken(color, 0.35);
  const light = lighten(color, 0.45);
  const deep = darken(color, 0.2);
  const motifShadow = darken(color, 0.45);

  const motifPath = MOTIF_PATHS[motif];
  let foreground = '';
  if (text) {
    // 文字：少し下にずらした暗い文字を先に描き、刻印のような影にする
    const t = escapeXml(text);
    foreground = `
  <g font-family="'Arial Rounded MT Bold', 'Hiragino Maru Gothic ProN', 'M PLUS Rounded 1c', sans-serif" font-weight="bold" font-size="${text.length > 1 ? 30 : 42}" text-anchor="middle" dominant-baseline="central">
    <text x="50" y="55.5" fill="${motifShadow}" opacity="0.5">${t}</text>
    <text x="50" y="54" fill="#fff">${t}</text>
  </g>`;
  } else if (motifPath) {
    foreground = `
  <path d="${motifPath}" fill="${motifShadow}" opacity="0.5" transform="translate(0 1.5)"/>
  <path d="${motifPath}" fill="#fff"/>`;
  }

  const sizeAttrs = size ? ` width="${size}" height="${size}"` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${sizeAttrs} role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <defs>
    <radialGradient id="${id.base}" cx="40%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="55%" stop-color="${color}"/>
      <stop offset="100%" stop-color="${deep}"/>
    </radialGradient>
    <radialGradient id="${id.shade}" cx="50%" cy="50%" r="50%">
      <stop offset="78%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.35"/>
    </radialGradient>
    <linearGradient id="${id.shine}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="${hl.opacity}"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="${rim}"/>
  <circle cx="50" cy="50" r="44" fill="url(#${id.base})"/>
  <circle cx="50" cy="50" r="44" fill="url(#${id.shade})"/>${foreground}
  <ellipse cx="${hl.cx}" cy="${hl.cy}" rx="${hl.rx}" ry="${hl.ry}" fill="url(#${id.shine})"/>
</svg>
`;
}
