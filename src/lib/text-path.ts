// 文字を「図形（パス）」にするための共通の処理。
// グロッシーバッジメーカー（text-badge-svg.ts）とテキストロゴメーカー（text-logo-svg.ts）で使う。
//
// フォントのデータ（opentype.js で読み込んだもの）から、1文字ずつ形を取り出して並べる。
// <text> ではなく図形として SVG に書くので、フォントを持っていない環境でも同じ見た目になる。
import type { Font, Glyph, PathCommand } from 'opentype.js';

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
export const SYMBOLS: Record<string, () => PathCommand[]> = {
  '★': () => polygonCommands(starPoints(1)),
  '☆': () => [...polygonCommands(starPoints(1)), ...polygonCommands(starPoints(0.62).reverse())],
  '♥': () => heartCommands(HEART_CW, 1),
  '♡': () => [...heartCommands(HEART_CW, 1), ...heartCommands(HEART_CCW, 0.6)],
};

/** 記号を、opentype.js の文字（Glyph）と同じように使えるものにする */
export function symbolGlyph(ch: string, upm: number): Glyph {
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

export interface PlacedGlyph {
  glyph: Glyph;
  font: Font;
  /** 字送り（1em を 1 とした値） */
  advance: number;
  /** 文字の左端の位置（1em を 1 とした値） */
  x: number;
}

/** 1文字ずつ、使うフォントを決めて横に並べる。どのフォントにもない文字は missing に入れる */
export function layoutLine(text: string, font: Font, fallback: Font | undefined, tracking: number, missing: Set<string>) {
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
export function referenceBox(text: string, font: Font, fallback?: Font) {
  const ref = /[\u3000-\u9fff\uff00-\uffef]/.test(text) ? '国' : 'H';
  const f = font.charToGlyphIndex(ref) !== 0 ? font : (fallback ?? font);
  const b = f.charToGlyph(ref).getPath(0, 0, 1).getBoundingBox();
  return { top: b.y1, bottom: b.y2, height: b.y2 - b.y1 };
}

/** パスの各点を、関数 tf で変換した位置に動かして SVG の d 属性の文字列にする */
export function commandsToD(cmds: PathCommand[], tf: (x: number, y: number) => [number, number]) {
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
