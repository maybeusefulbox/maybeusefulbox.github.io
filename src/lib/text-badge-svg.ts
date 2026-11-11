// 文字入りバッジ（缶バッジ・記念メダル風）の SVG を組み立てる処理。
//
// 下から順に重ねる：
//   1. 縁（リム）       … いちばん外側の暗い円
//   2. 帯               … 濃い色の輪っか。ここに文字が円に沿って入る
//   3. 内側の丸         … 帯より明るい色。中央に大きな文字を置く（境目に細い縁を付ける）
//   4. 内側の影         … 外周だけ暗くして立体感を出す
//   5. 中央の文字
//   6. ツヤ             … 既存のバッジと同じハイライト楕円
//   7. 帯の文字（上・下）… ツヤの白と重なると読みにくいので、ツヤより上に描く
//
// 文字はフォントのデータから「図形（パス）」に変換して描く。
// <text> を使わないので、フォントを持っていない環境で SVG を開いても同じ見た目になる。
import type { Font, Glyph, PathCommand } from 'opentype.js';
import {
  baseGradientDef,
  shadeGradientDef,
  shineGradientDef,
  highlightEllipse,
  escapeXml,
  DEFAULT_HIGHLIGHT,
  type Highlight,
} from './badge-svg';
import { lighten, darken, luminance } from './color';

/** auto：背景の明るさで白か濃い色を自動で選ぶ。neon-◯◯：蛍光色（NEON_COLORS を参照） */
export type TextColorMode = 'auto' | 'white' | 'dark' | 'neon-pink' | 'neon-yellow' | 'neon-green' | 'neon-blue';

export interface TextBadgeOptions {
  color: string;
  top: string;
  bottom: string;
  center: string;
  textColor: TextColorMode;
  /** 選んだフォント */
  font: Font;
  /** 選んだフォントにない文字を描くフォント（読み込んでいなければ undefined） */
  fallback?: Font;
  highlight?: Partial<Highlight>;
  /** 内側の丸いっぱいに敷く画像（なければ色だけ） */
  image?: CenterImage;
  size?: number;
  title?: string;
  idPrefix?: string;
}

export interface CenterImage {
  /** 画像のデータ（data: から始まる文字列）。SVG の中に埋め込まれる */
  href: string;
  /** 画像の元の幅・高さ（px） */
  width: number;
  height: number;
  /** 拡大率。1 で、丸がちょうど画像の短い辺で埋まる */
  zoom: number;
  /** 位置。-1〜1。0 が真ん中で、丸からはみ出している範囲の中で動かす */
  x: number;
  y: number;
}

export interface TextBadgeResult {
  svg: string;
  /** どのフォントにも入っていない文字（描けなかった文字） */
  missing: string[];
  /** 文字が多すぎて、かなり小さくなってしまった場所 */
  tooLong: { top: boolean; bottom: boolean; center: boolean };
}

// ---------- 寸法（viewBox 0〜100 上の値）。数値を変えると形が変わる ----------
const C = 50; // 中心
const R_RIM = 48; // 縁の外側
const R_BAND = 46; // 帯の外側
const R_RING = 31.8; // 帯と内側の丸の境目の細い縁
const R_INNER = 30.6; // 内側の丸
const R_TEXT = (R_BAND + R_RING) / 2; // 帯の文字の中心が通る円
const BAND_TEXT_HEIGHT = 7.8; // 帯の文字の高さ（大文字・漢字の高さ）
const TRACKING = 0.06; // 帯の文字の字間（文字の大きさに対する割合）
// 文字を並べられる角度の上限（度）。上下両方に文字があるときは、左右にすき間を残す
const ARC_MAX_BOTH = { top: 150, bottom: 110 };
const ARC_MAX_TOP_ONLY = 220;
// 中央の文字が収まる枠
const CENTER_MAX_W = 46;
const CENTER_MAX_H = 28;
const CENTER_Y = 51.5; // ツヤと重なりすぎないよう、ほんの少し下げる
// これより小さくなったら「文字が多すぎる」と知らせる（本来の大きさに対する割合）
const TOO_SMALL = 0.6;

// ---------- フォントにない記号を図形で描く ----------
// 英字フォントには ★ や ♡ が入っていない。そのために重い日本語フォントを読み込まなくて済むよう、
// この4つだけは自前の図形で代用する（日本語フォントを選んでいるときは、フォントの記号を使う）

type Pt = [number, number];

/** 5角星の頂点（1em の正方形の中。y は下向き、0 がベースライン） */
function starPoints(scale: number): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const r = (i % 2 === 0 ? 0.46 : 0.19) * scale;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [0.5 + r * Math.cos(a), -0.36 + r * Math.sin(a)] as Pt;
  });
}

// ハート（既存バッジのハートと同じ形）を 1em の正方形に収めた曲線。
// 1つ目は時計回り、2つ目は同じ形を逆回りにたどったもの（小さくして重ねると中が抜けて ♡ になる）
const HEART_CW = 'M50 70C30 56 28 38 41 37C46 37 50 41 50 45C50 41 54 37 59 37C72 38 70 56 50 70Z';
const HEART_CCW = 'M50 70C70 56 72 38 59 37C54 37 50 41 50 45C50 41 46 37 41 37C28 38 30 56 50 70Z';

function heartCommands(d: string, scale: number): PathCommand[] {
  // 元の座標（ハートの中心はおよそ (50, 53)、幅 43）を 1em 基準に変換する
  const nums = d.match(/-?[\d.]+/g)!.map(Number);
  const tf = (x: number, y: number): Pt => [0.5 + ((x - 50) / 50) * scale, -0.36 + ((y - 53) / 50) * scale];
  const cmds: PathCommand[] = [];
  let i = 0;
  const [mx, my] = tf(nums[i++], nums[i++]);
  cmds.push({ type: 'M', x: mx, y: my });
  while (i < nums.length) {
    const [x1, y1] = tf(nums[i++], nums[i++]);
    const [x2, y2] = tf(nums[i++], nums[i++]);
    const [x, y] = tf(nums[i++], nums[i++]);
    cmds.push({ type: 'C', x1, y1, x2, y2, x, y });
  }
  cmds.push({ type: 'Z' });
  return cmds;
}

function polygonCommands(pts: Pt[]): PathCommand[] {
  return [
    ...pts.map(([x, y], i) => ({ type: i === 0 ? 'M' : 'L', x, y }) as PathCommand),
    { type: 'Z' } as PathCommand,
  ];
}

/** 1em を 1 とした大きさで、記号の形を返す */
const SYMBOLS: Record<string, () => PathCommand[]> = {
  '★': () => polygonCommands(starPoints(1)),
  '☆': () => [...polygonCommands(starPoints(1)), ...polygonCommands(starPoints(0.62).reverse())],
  '♥': () => heartCommands(HEART_CW, 1),
  '♡': () => [...heartCommands(HEART_CW, 1), ...heartCommands(HEART_CCW, 0.6)],
};

/** 記号を、opentype.js の文字（Glyph）と同じように使えるものにする */
function symbolGlyph(ch: string, upm: number): Glyph {
  const unit = SYMBOLS[ch]();
  return {
    index: -1,
    advanceWidth: upm,
    getPath(x: number, y: number, size: number) {
      const commands = unit.map((c) => {
        const m = { ...c };
        for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']] as const) {
          if (m[kx] !== undefined) {
            m[kx] = x + m[kx]! * size;
            m[ky] = y + m[ky]! * size;
          }
        }
        return m;
      });
      return {
        commands,
        getBoundingBox() {
          const xs = commands.flatMap((c) => [c.x, c.x1, c.x2]).filter((v): v is number => v !== undefined);
          const ys = commands.flatMap((c) => [c.y, c.y1, c.y2]).filter((v): v is number => v !== undefined);
          return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
        },
      };
    },
  };
}

/** フォントに入っておらず、代用の図形もない文字があるか（あれば代わりのフォントの読み込みが必要） */
export function needsFallback(font: Font, text: string): boolean {
  return Array.from(text).some((ch) => ch.trim() !== '' && font.charToGlyphIndex(ch) === 0 && !SYMBOLS[ch]);
}

// ---------- 文字をパスにする下準備 ----------

interface PlacedGlyph {
  glyph: Glyph;
  font: Font;
  /** 字送り（1em を 1 とした値） */
  advance: number;
  /** 文字の左端の位置（1em を 1 とした値） */
  x: number;
}

/** 1文字ずつ、使うフォントを決めて横に並べる。どのフォントにもない文字は missing に入れる */
function layoutLine(text: string, font: Font, fallback: Font | undefined, tracking: number, missing: Set<string>) {
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  let prev: { glyph: Glyph; font: Font } | null = null;
  for (const ch of Array.from(text)) {
    let f: Font | undefined = font;
    if (font.charToGlyphIndex(ch) === 0 && SYMBOLS[ch]) {
      // フォントにない ★ ♡ などは、自前の図形で描く
      const advance = 1;
      glyphs.push({ glyph: symbolGlyph(ch, font.unitsPerEm), font, advance, x });
      x += advance + tracking;
      prev = null;
      continue;
    }
    if (font.charToGlyphIndex(ch) === 0) {
      if (fallback && fallback.charToGlyphIndex(ch) !== 0) f = fallback;
      else if (ch.trim() === '') f = fallback ?? font; // 全角スペースなど
      else {
        missing.add(ch);
        continue;
      }
    }
    const glyph = f.charToGlyph(ch);
    // カーニング：「AV」のように、組み合わせによって字間を詰めると自然に見える文字の調整
    if (prev && prev.font === f) {
      try {
        x += f.getKerningValue(prev.glyph, glyph) / f.unitsPerEm;
      } catch {
        // カーニング情報が読めないフォントは調整しない
      }
    }
    const advance = (glyph.advanceWidth ?? f.unitsPerEm * 0.5) / f.unitsPerEm;
    glyphs.push({ glyph, font: f, advance, x });
    x += advance + tracking;
    prev = { glyph, font: f };
  }
  const width = glyphs.length ? x - tracking : 0;
  return { glyphs, width };
}

/** 文字の高さの基準になる文字（漢字やかながあれば「国」、なければ「H」）の上端と下端（1em を 1 とした値） */
function referenceBox(text: string, font: Font, fallback?: Font) {
  const ref = /[　-鿿＀-￯]/.test(text) ? '国' : 'H';
  const f = font.charToGlyphIndex(ref) !== 0 ? font : (fallback ?? font);
  const b = f.charToGlyph(ref).getPath(0, 0, 1).getBoundingBox();
  return { top: b.y1, bottom: b.y2, height: b.y2 - b.y1 };
}

/** パスの各点を、関数 tf で変換した位置に動かして SVG の d 属性の文字列にする */
function commandsToD(cmds: PathCommand[], tf: (x: number, y: number) => [number, number]) {
  const n = (v: number) => (Math.round(v * 100) / 100).toString();
  const p = (x?: number, y?: number) => tf(x ?? 0, y ?? 0).map(n).join(' ');
  let d = '';
  for (const c of cmds) {
    if (c.type === 'M') d += `M${p(c.x, c.y)}`;
    else if (c.type === 'L') d += `L${p(c.x, c.y)}`;
    else if (c.type === 'Q') d += `Q${p(c.x1, c.y1)} ${p(c.x, c.y)}`;
    else if (c.type === 'C') d += `C${p(c.x1, c.y1)} ${p(c.x2, c.y2)} ${p(c.x, c.y)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  return d;
}

/**
 * 帯の文字を円に沿って並べたパスを作る。
 * 上側：時計回りに並べ、文字の頭が外側を向く。
 * 下側：反時計回りに並べ、文字の頭が中心を向く（さかさまにならず、左から右へ読める）。
 */
function arcText(text: string, side: 'top' | 'bottom', maxDeg: number, font: Font, fallback: Font | undefined, missing: Set<string>) {
  const { glyphs, width } = layoutLine(text, font, fallback, TRACKING, missing);
  if (!glyphs.length) return { d: '', tooLong: false };
  const ref = referenceBox(text, font, fallback);

  // 本来の大きさ（文字の高さが BAND_TEXT_HEIGHT になる大きさ）と、角度の上限に収まる大きさの小さいほう
  const idealSize = BAND_TEXT_HEIGHT / ref.height;
  const fitSize = (R_TEXT * ((maxDeg * Math.PI) / 180)) / width;
  const size = Math.min(idealSize, fitSize);

  // 文字の上下の真ん中が R_TEXT の円に乗るように、ベースライン（文字の下の線）の半径を決める
  const midFromBaseline = -((ref.top + ref.bottom) / 2) * size; // ベースラインから文字の真ん中までの高さ
  const totalAngle = (width * size) / R_TEXT;

  let d = '';
  for (const g of glyphs) {
    const centerAlong = (g.x + g.advance / 2) * size; // 文字列の左端から、この文字の中心までの長さ
    const path = g.glyph.getPath(0, 0, size);
    const half = (g.advance * size) / 2;
    let tf: (x: number, y: number) => [number, number];
    if (side === 'top') {
      // 真上を 0 として時計回りの角度
      const a = -totalAngle / 2 + centerAlong / R_TEXT;
      const rb = R_TEXT - midFromBaseline; // ベースラインの半径（文字は外側へ伸びる）
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      tf = (x, y) => {
        // 文字の中心を原点にした座標 (lx, ly) を、角度 a だけ回して円の上に置く
        const lx = x - half;
        const ly = y - rb;
        return [C + lx * cos - ly * sin, C + lx * sin + ly * cos];
      };
    } else {
      // 真下を 0 として、左から右へ並べる（反時計回り）
      const a = totalAngle / 2 - centerAlong / R_TEXT;
      const rb = R_TEXT + midFromBaseline; // ベースラインの半径（文字は中心へ伸びる）
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      tf = (x, y) => {
        const lx = x - half;
        const ly = y + rb;
        return [C + lx * cos - ly * sin, C + lx * sin + ly * cos];
      };
    }
    d += commandsToD(path.commands, tf);
  }
  return { d, tooLong: size < idealSize * TOO_SMALL };
}

/** 中央の文字のパスを作る。枠に収まる大きさで、見た目の上下左右の真ん中に置く */
function centerText(text: string, font: Font, fallback: Font | undefined, missing: Set<string>) {
  const { glyphs, width } = layoutLine(text, font, fallback, 0, missing);
  if (!glyphs.length) return { d: '', tooLong: false };

  // 実際の文字の形の上端・下端（1em を 1 とした値）
  let top = Infinity;
  let bottom = -Infinity;
  for (const g of glyphs) {
    const b = g.glyph.getPath(0, 0, 1).getBoundingBox();
    if (b.y2 > b.y1) {
      top = Math.min(top, b.y1);
      bottom = Math.max(bottom, b.y2);
    }
  }
  if (!isFinite(top)) return { d: '', tooLong: false }; // 空白だけのとき
  const ref = referenceBox(text, font, fallback);
  // 高さは「基準の文字」で決める。こうすると「1」と「NEW」で文字の高さがそろう
  const idealSize = CENTER_MAX_H / Math.max(ref.height, bottom - top);
  // 1〜3文字なら本来の大きさで入り、それより長いと横幅に合わせて縮小される
  const fitSize = CENTER_MAX_W / width;
  const size = Math.min(idealSize, fitSize);

  const ox = C - (width * size) / 2;
  const oy = CENTER_Y - ((top + bottom) / 2) * size;
  let d = '';
  for (const g of glyphs) {
    const path = g.glyph.getPath(0, 0, size);
    const gx = ox + g.x * size;
    d += commandsToD(path.commands, (x, y) => [gx + x, oy + y]);
  }
  // 全角3文字ぶんの幅で入る大きさよりも、さらに小さくなったときだけ知らせる
  const threeCharSize = Math.min(idealSize, CENTER_MAX_W / 3);
  return { d, tooLong: size < threeCharSize * 0.75 };
}

// ---------- 色 ----------

/** 蛍光色の文字の色。キーは textColor に指定する値 */
export const NEON_COLORS: Record<string, { name: string; hex: string }> = {
  'neon-pink': { name: '蛍光ピンク', hex: '#ff2d95' },
  'neon-yellow': { name: '蛍光イエロー', hex: '#ffea00' },
  'neon-green': { name: '蛍光グリーン', hex: '#3dff5a' },
  'neon-blue': { name: '蛍光ブルー', hex: '#19d9ff' },
};

interface TextStyle {
  fill: string;
  /** 文字の下に少しずらして敷く影 */
  shadow?: { color: string; opacity: number; dy: number };
  /** 縁取り。外側（太いもの）から順に描く */
  outlines: { color: string; width: number }[];
}

/** 文字の色・影・縁取りを決める */
function textStyle(mode: TextColorMode, background: string, base: string): TextStyle {
  const neon = NEON_COLORS[mode];
  if (neon) {
    // コンサートのうちわ風：蛍光色の文字に「濃い色＋白」の二重の縁取り。
    // 縁取りがあるので、ツヤの白と重なっても文字の形がはっきり見える
    return {
      fill: neon.hex,
      outlines: [
        { color: darken(base, 0.55), width: 2.6 },
        { color: '#fff', width: 1.5 },
      ],
    };
  }
  const useWhite = mode === 'white' || (mode === 'auto' && luminance(background) < 0.42);
  if (useWhite) {
    // 白い文字には細い濃い色の縁を付けて、ツヤの白と重なっても読めるようにする
    return {
      fill: '#fff',
      shadow: { color: darken(background, 0.45), opacity: 0.55, dy: 0.7 },
      outlines: [{ color: darken(background, 0.3), width: 0.7 }],
    };
  }
  // 濃い文字は、下に白い影を敷くと刻印のように見える
  return { fill: darken(base, 0.62), shadow: { color: '#fff', opacity: 0.45, dy: 0.6 }, outlines: [] };
}

function textLayer(d: string, s: TextStyle) {
  if (!d) return '';
  // 縁取り：同じ形を太い線で描いてから、上に文字を重ねる（線の角は丸くして、角がとがらないようにする）
  const outlines = s.outlines
    .map((o) => `\n  <path d="${d}" fill="none" stroke="${o.color}" stroke-width="${o.width}" stroke-linejoin="round"/>`)
    .join('');
  const shadow = s.shadow
    ? `\n  <path d="${d}" fill="${s.shadow.color}" opacity="${s.shadow.opacity}" transform="translate(0 ${s.shadow.dy})"/>`
    : '';
  return `${shadow}${outlines}
  <path d="${d}" fill="${s.fill}"/>`;
}

// ---------- 中央の画像 ----------

/**
 * 画像を内側の丸の形に切り抜いて敷く。
 * clipPath（切り抜きの型）に丸を指定すると、丸の外にはみ出した部分は表示されない。
 * 上に内側向きの薄い影を重ねて、缶バッジのように丸のふちを少し沈ませる
 */
function imageLayer(img: CenterImage, clipId: string, edgeId: string) {
  const D = R_INNER * 2;
  // 短い辺が丸の直径になる大きさ × 拡大率
  const scale = (D / Math.min(img.width, img.height)) * img.zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  // はみ出している量の範囲で位置を動かす（はみ出しがなければ動かない）
  const x = C - w / 2 + img.x * Math.max(0, (w - D) / 2);
  const y = C - h / 2 + img.y * Math.max(0, (h - D) / 2);
  const n = (v: number) => Math.round(v * 100) / 100;
  // href と xlink:href の両方を書く：古いグラフィックソフトは xlink:href しか読めないため
  return `
  <g clip-path="url(#${clipId})">
    <image href="${img.href}" xlink:href="${img.href}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="none"/>
    <circle cx="${C}" cy="${C}" r="${R_INNER}" fill="url(#${edgeId})"/>
  </g>`;
}

// ---------- 組み立て ----------

export function renderTextBadgeSvg(o: TextBadgeOptions): TextBadgeResult {
  const hl = { ...DEFAULT_HIGHLIGHT, ...o.highlight };
  const prefix = o.idPrefix ?? 'tb';
  const id = {
    band: `${prefix}-band`,
    inner: `${prefix}-inner`,
    shade: `${prefix}-shade`,
    shine: `${prefix}-shine`,
    clip: `${prefix}-clip`,
    edge: `${prefix}-edge`,
  };

  // 帯は元の色をほんの少しだけ暗く、内側の丸は明るくする。数値を大きくすると差が強くなる
  const bandColor = darken(o.color, 0.05);
  const innerColor = lighten(o.color, 0.2);
  const rim = darken(o.color, 0.3);

  const missing = new Set<string>();
  const top = o.top.trim();
  const bottom = o.bottom.trim();
  const arcTop = arcText(top, 'top', bottom ? ARC_MAX_BOTH.top : ARC_MAX_TOP_ONLY, o.font, o.fallback, missing);
  const arcBottom = arcText(bottom, 'bottom', ARC_MAX_BOTH.bottom, o.font, o.fallback, missing);
  const center = centerText(o.center.trim(), o.font, o.fallback, missing);

  const bandText = textStyle(o.textColor, bandColor, o.color);
  const centerColors = textStyle(o.textColor, innerColor, o.color);

  // 上下両方に文字があるときは、左右（3時と9時の位置）に小さな丸を置いて区切る
  const dots =
    top && bottom
      ? [-1, 1]
          .map((s) => `<circle cx="${C + s * R_TEXT}" cy="${C}" r="1.3" fill="${bandText.fill}" opacity="0.85"/>`)
          .join('')
      : '';

  const sizeAttrs = o.size ? ` width="${o.size}" height="${o.size}"` : '';
  const title = o.title ?? ([top, o.center.trim(), bottom].filter(Boolean).join(' ') || 'バッジ');

  // 画像を使うときだけ、切り抜きの型と、ふちを沈ませる影を用意する
  const imageDefs = o.image
    ? `
    <clipPath id="${id.clip}"><circle cx="${C}" cy="${C}" r="${R_INNER}"/></clipPath>
    <radialGradient id="${id.edge}" cx="50%" cy="50%" r="50%">
      <stop offset="82%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.28"/>
    </radialGradient>`
    : '';
  const xlinkNs = o.image ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg"${xlinkNs} viewBox="0 0 100 100"${sizeAttrs} role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <defs>
    ${baseGradientDef(id.band, bandColor, 0.35, 0.12)}
    ${baseGradientDef(id.inner, innerColor, 0.45, 0.12)}
    ${shadeGradientDef(id.shade, 0.18)}
    ${shineGradientDef(id.shine, hl.opacity)}${imageDefs}
  </defs>
  <circle cx="${C}" cy="${C}" r="${R_RIM}" fill="${rim}"/>
  <circle cx="${C}" cy="${C}" r="${R_BAND}" fill="url(#${id.band})"/>
  <circle cx="${C}" cy="${C}" r="${R_RING}" fill="${rim}"/>
  <circle cx="${C}" cy="${C}" r="${R_INNER}" fill="url(#${id.inner})"/>${o.image ? imageLayer(o.image, id.clip, id.edge) : ''}
  <circle cx="${C}" cy="${C}" r="${R_BAND}" fill="url(#${id.shade})"/>${textLayer(center.d, centerColors)}
  ${highlightEllipse(hl, id.shine)}${textLayer(arcTop.d + arcBottom.d, bandText)}
  ${dots}
</svg>
`;

  return {
    svg,
    missing: [...missing],
    tooLong: { top: arcTop.tooLong, bottom: arcBottom.tooLong, center: center.tooLong },
  };
}
