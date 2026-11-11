// 1色（#rrggbb）から、グロッシー表現に必要な明るい色・暗い色を作るための小さな関数群。
// 色ごとに手でグラデーションを指定しなくても、ベース色を変えるだけで色違いを量産できる。

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/** a と b を t（0〜1）の割合で混ぜる。t=0 なら a、t=1 なら b */
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** 白を混ぜて明るくする */
export function lighten(hex: string, amount: number): string {
  return rgbToHex(mix(hexToRgb(hex), [255, 255, 255], amount));
}

/**
 * 色の明るさ（0＝黒〜1＝白）。人の目は緑を明るく、青を暗く感じるので、その感じ方に合わせて重みを付けている。
 * 文字の色を「白」と「濃い色」のどちらにすると読みやすいかの判定に使う
 */
export function luminance(hex: string): number {
  const lin = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** 黒を混ぜて暗くする */
export function darken(hex: string, amount: number): string {
  return rgbToHex(mix(hexToRgb(hex), [0, 0, 0], amount));
}
