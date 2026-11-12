// ぷっくりシール風の「ぷっくり樹脂」をピクセル単位で計算して描く処理。
//
// 考え方は 3D の簡易レンダリング：
//   1. 画像の形から「高さ」を計算する（輪郭で低く、内側で高いドーム）
//   2. 高さの傾きから、各ピクセルの面の向き（法線）を求める
//   3. 面の向きを使って、レンズの歪み・ツヤ・縁の暗さ・光のたまりを計算する
//
// DOM に触らず数値だけを扱うので、ブラウザの canvas から ImageData を渡して使う。

export interface PuffyLight {
  /** 光の向き（-1〜1）。x は左が負、y は上が負 */
  x: number;
  y: number;
  /** ツヤの大きさ（0〜1） */
  size: number;
  /** ツヤの濃さ（0〜1） */
  strength: number;
  /** ツヤの輪郭のぼかし（0〜1）。0 でくっきり */
  blur: number;
}

export interface PuffyParams {
  /** ぷっくり度（0〜100） */
  puff: number;
  /** フチの太さ（400px 基準の値） */
  border: number;
  /** フチの色（#rrggbb） */
  borderColor: string;
  /** フチの透明感（0〜100） */
  clarity: number;
  light: PuffyLight;
  /** 反対側にも小さなツヤを足すか */
  sparkle: boolean;
}

// ---------- 小さな計算部品 ----------

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * ユークリッド距離変換：inside が 1 のピクセルについて、一番近い 0 のピクセルまでの距離を求める。
 * 全ピクセルを総当たりすると遅いので、縦→横の順に1次元ずつ計算する定番の方法を使う。
 */
function distanceTransform(inside: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e12;
  const size = Math.max(w, h);
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) grid[i] = inside[i] ? INF : 0;

  const transform1d = (n: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[x + y * w];
    transform1d(h);
    for (let y = 0; y < h; y++) grid[x + y * w] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[x + y * w];
    transform1d(w);
    for (let x = 0; x < w; x++) grid[x + y * w] = d[x];
  }

  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(grid[i]);
  return out;
}

/** 箱ぼかし。半径が変わっても速度が変わらず、複数回かけるとガウスぼかしに近づく */
function boxBlur(src: Float32Array, w: number, h: number, radius: number, passes = 2): Float32Array {
  const r = Math.max(0, Math.round(radius));
  if (r === 0) return src.slice();
  let a = src.slice();
  let b = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = a[row] * (r + 1);
      for (let i = 1; i <= r; i++) sum += a[row + Math.min(i, w - 1)];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum * norm;
        sum += a[row + Math.min(x + r + 1, w - 1)] - a[row + Math.max(x - r, 0)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = b[x] * (r + 1);
      for (let i = 1; i <= r; i++) sum += b[x + Math.min(i, h - 1) * w];
      for (let y = 0; y < h; y++) {
        a[x + y * w] = sum * norm;
        sum += b[x + Math.min(y + r + 1, h - 1) * w] - b[x + Math.max(y - r, 0) * w];
      }
    }
  }
  return a;
}

/**
 * 形を「風船のように膨らませた」高さを求める。
 * 輪郭に固定した膜を内側から押したときの形（ポアソン方程式）を、周囲との平均を繰り返して解く。
 * 距離だけで作る高さと違って折り目が出ず、丸い形なら半球になる。
 * 全ピクセルで解くと遅いので、粗い格子で解いてから元の大きさに広げる。
 */
function inflate(inside: Uint8Array, S: number): Float32Array {
  const scale = Math.max(1, Math.round(S / 160));
  const G = Math.floor(S / scale);
  const cells: number[] = [];
  for (let y = 1; y < G - 1; y++) {
    for (let x = 1; x < G - 1; x++) {
      if (inside[Math.min(S - 1, x * scale + (scale >> 1)) + Math.min(S - 1, y * scale + (scale >> 1)) * S]) {
        cells.push(x + y * G);
      }
    }
  }
  const u = new Float32Array(G * G);
  // 少し行き過ぎるように更新すると（SOR 法）、少ない回数で収まる
  const omega = 1.92;
  for (let iter = 0; iter < 260; iter++) {
    for (const i of cells) {
      const next = (u[i - 1] + u[i + 1] + u[i - G] + u[i + G] + 1) / 4;
      u[i] += omega * (next - u[i]);
    }
  }
  // 平方根をとると断面が円に近づく。半径 R の円で中央の高さがちょうど R（ピクセル）になる係数をかける
  const low = new Float32Array(G * G);
  for (let i = 0; i < low.length; i++) low[i] = 2 * scale * Math.sqrt(Math.max(0, u[i]));

  const out = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const gy = Math.min(G - 1.001, Math.max(0, (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    for (let x = 0; x < S; x++) {
      const gx = Math.min(G - 1.001, Math.max(0, (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const i = x0 + y0 * G;
      out[x + y * S] =
        low[i] * (1 - fx) * (1 - fy) + low[i + 1] * fx * (1 - fy) + low[i + G] * (1 - fx) * fy + low[i + G + 1] * fx * fy;
    }
  }
  return out;
}

// ---------- 白背景の除去 ----------

/**
 * 画像の端からつながっている白い部分だけを透明にする（塗りつぶしツールと同じ考え方）。
 * 端とつながっていない白（キャラクターの顔や体の白）は残るので、白いキャラクターでも中身が抜けない。
 *
 * @param tolerance どのくらい白に近ければ背景とみなすか（0〜255）
 */
export function removeWhiteBackground(src: ImageData, tolerance: number): ImageData {
  const { width: w, height: h } = src;
  const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
  const px = out.data;
  const n = w * h;
  const removed = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;

  const threshold = 255 - tolerance;
  const isBackground = (i: number) => {
    const p = i * 4;
    return px[p + 3] < 16 || Math.min(px[p], px[p + 1], px[p + 2]) >= threshold;
  };
  const visit = (i: number) => {
    if (!removed[i] && isBackground(i)) {
      removed[i] = 1;
      stack[top++] = i;
    }
  };

  // 画像の四辺から塗りつぶしを始める
  for (let x = 0; x < w; x++) {
    visit(x);
    visit(x + (h - 1) * w);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(w - 1 + y * w);
  }
  while (top > 0) {
    const i = stack[--top];
    const x = i % w;
    if (x > 0) visit(i - 1);
    if (x < w - 1) visit(i + 1);
    if (i >= w) visit(i - w);
    if (i < n - w) visit(i + w);
  }

  for (let i = 0; i < n; i++) if (removed[i]) px[i * 4 + 3] = 0;

  // 背景との境目は白と混ざった色になっているので、透明度を付けて白フチが残らないようにする
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) if (removed[i]) frontier.push(i);
  const touched = new Uint8Array(removed);
  for (let ring = 0; ring < 2; ring++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % w;
      const neighbors = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const j of neighbors) {
        if (j < 0 || j >= n || touched[j]) continue;
        touched[j] = 1;
        next.push(j);
        const p = j * 4;
        const coverage = clamp01((255 - Math.min(px[p], px[p + 1], px[p + 2])) / (tolerance + 70));
        if (coverage > 0 && coverage < 1) {
          for (let c = 0; c < 3; c++) px[p + c] = (px[p + c] - 255 * (1 - coverage)) / coverage;
          px[p + 3] *= coverage;
        }
      }
    }
    frontier = next;
  }

  // JPEG のノイズなどで残った小さな点を消す
  const seen = new Uint8Array(n);
  const minArea = n * 0.0002;
  for (let start = 0; start < n; start++) {
    if (seen[start] || px[start * 4 + 3] === 0) continue;
    const component: number[] = [];
    top = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const i = stack[--top];
      component.push(i);
      const x = i % w;
      const neighbors = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const j of neighbors) {
        if (j >= 0 && j < n && !seen[j] && px[j * 4 + 3] > 0) {
          seen[j] = 1;
          stack[top++] = j;
        }
      }
    }
    if (component.length < minArea) for (const i of component) px[i * 4 + 3] = 0;
  }
  return out;
}

/** 四隅がほぼ白か透明なら「背景を消せる画像」と判断する */
export function looksLikePlainBackground(src: ImageData): boolean {
  const { width: w, height: h, data } = src;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  return corners.every((i) => {
    const p = i * 4;
    return data[p + 3] < 16 || Math.min(data[p], data[p + 1], data[p + 2]) >= 235;
  });
}

// ---------- 形状の計算 ----------

/** 形が変わったときだけ計算し直せばよいデータ。ツヤの調整だけなら使い回せるので軽い */
export interface PuffyGeometry {
  size: number;
  art: Uint8ClampedArray;
  coverage: Float32Array;
  dist: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  bleedR: Float32Array;
  bleedG: Float32Array;
  bleedB: Float32Array;
  bleedA: Float32Array;
  shadow: Float32Array;
  puff: number;
  refraction: number;
}

export function buildGeometry(art: ImageData, border400: number, puff: number): PuffyGeometry {
  const S = art.width;
  const n = S * S;
  const unit = S / 400;
  const p = clamp01(puff / 100);
  const px = art.data;

  // シールの形：絵の不透明な部分を、フチの太さぶん外へ広げる
  const outside = new Uint8Array(n);
  for (let i = 0; i < n; i++) outside[i] = px[i * 4 + 3] > 127 ? 0 : 1;
  const toArt = distanceTransform(outside, S, S);
  const borderPx = border400 * unit;
  // 半径が大きいほど、絵の細かい凹凸を拾わない丸い外形になる。大きすぎるとキャラクターの形が消える
  const roundRadius = Math.max(1, 4 * unit + borderPx * 0.45);
  // 丸めると出っ張った部分の余白が減るので、その分を先に足しておく
  const grow = borderPx + (borderPx > 0 ? roundRadius * 0.45 : 0);
  const blob = new Float32Array(n);
  for (let i = 0; i < n; i++) blob[i] = toArt[i] <= grow ? 1 : 0;

  // ぼかしてからくっきりさせると、角や細い隙間が丸まって、溶けた樹脂のような形になる
  const blurred = boxBlur(blob, S, S, roundRadius, 3);
  const coverage = new Float32Array(n);
  const edgeSharp = Math.max(2, roundRadius * 1.2);
  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    // 丸めた結果で絵が欠けないよう、絵のある部分は必ずシールの内側に含める
    coverage[i] = Math.max(clamp01((blurred[i] - 0.5) * edgeSharp + 0.5), px[i * 4 + 3] / 255);
    inside[i] = blurred[i] > 0.5 || px[i * 4 + 3] > 127 ? 1 : 0;
  }

  // 形を風船のように膨らませて高さを作る。縁だけは輪郭からの距離を使ってきれいに丸める
  // 距離はピクセル単位で段になるので、少しぼかして縁のギザギザを消す
  const dist = boxBlur(distanceTransform(inside, S, S), S, S, 1.5 * unit, 2);
  // 高さは粗いマス目で解いているので、マス目の段が出ないようにならす
  const balloon = boxBlur(inflate(inside, S), S, S, Math.max(2, S / 160), 2);
  const heightFactor = 0.3 + 0.75 * p;
  const rimRadius = 5 * unit;
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = Math.min(dist[i] / rimRadius, 1);
    raw[i] = balloon[i] * heightFactor * Math.sqrt(1 - (1 - t) * (1 - t));
  }
  const height = boxBlur(raw, S, S, 2 * unit, 2);

  // 高さの傾きから法線（面の向き）を求める
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);
  const nz = new Float32Array(n);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = x + y * S;
      const dx = (height[x < S - 1 ? i + 1 : i] - height[x > 0 ? i - 1 : i]) * 0.5;
      const dy = (height[y < S - 1 ? i + S : i] - height[y > 0 ? i - S : i]) * 0.5;
      const len = Math.hypot(dx, dy, 1);
      nx[i] = -dx / len;
      ny[i] = -dy / len;
      nz[i] = 1 / len;
    }
  }

  // 色のにじみ：絵の色を大きくぼかしておき、透明なフチをほんのり色づける
  const bR = new Float32Array(n);
  const bG = new Float32Array(n);
  const bB = new Float32Array(n);
  const bA = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3] / 255;
    bR[i] = (px[i * 4] / 255) * a;
    bG[i] = (px[i * 4 + 1] / 255) * a;
    bB[i] = (px[i * 4 + 2] / 255) * a;
    bA[i] = a;
  }
  const bleedRadius = 10 * unit;

  // 落ち影：形をぼかして右下へずらす
  const soft = boxBlur(coverage, S, S, 5 * unit, 3);
  const shadow = new Float32Array(n);
  const offX = Math.round(2 * unit);
  const offY = Math.round(5 * unit);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const sx = x - offX;
      const sy = y - offY;
      shadow[x + y * S] = sx >= 0 && sy >= 0 && sx < S && sy < S ? soft[sx + sy * S] : 0;
    }
  }

  return {
    size: S,
    art: px,
    coverage,
    dist,
    nx,
    ny,
    nz,
    bleedR: boxBlur(bR, S, S, bleedRadius),
    bleedG: boxBlur(bG, S, S, bleedRadius),
    bleedB: boxBlur(bB, S, S, bleedRadius),
    bleedA: boxBlur(bA, S, S, bleedRadius),
    shadow,
    puff: p,
    refraction: 11 * unit * (0.4 + p),
  };
}

// ---------- 色の計算 ----------

/** 形状データとツヤの設定から、最終的な画像を作る */
export function shade(g: PuffyGeometry, params: PuffyParams): ImageData {
  const S = g.size;
  const unit = S / 400;
  const out = new ImageData(S, S);
  const dst = out.data;
  const p = g.puff;
  const art = g.art;
  const [borderR, borderG, borderB] = hexToRgb01(params.borderColor);
  const borderAlpha = 1 - (clamp01(params.clarity / 100) * 0.75);

  // 光の来る方向（平面上の向き）。左上から照らす想定
  const light = params.light;
  const lightDirLen = Math.hypot(light.x, light.y) || 1;
  const dirX = light.x / lightDirLen;
  const dirY = light.y / lightDirLen;

  // ツヤの点：面の向きがこの向きに近い場所だけ丸く光る
  const spotLen = Math.hypot(dirX * 0.3, dirY * 0.3, 1);
  const spotX = (dirX * 0.3) / spotLen;
  const spotY = (dirY * 0.3) / spotLen;
  const spotZ = 1 / spotLen;

  const bandWidth = 0.025 + 0.075 * light.size;
  const edgeSoft = 0.006 + 0.14 * light.blur;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = x + y * S;
      const d4 = i * 4;
      const cov = g.coverage[i];
      const shadowA = g.shadow[i] * 0.26;

      if (cov <= 0) {
        // シールの外：落ち影だけ
        dst[d4] = 40;
        dst[d4 + 1] = 30;
        dst[d4 + 2] = 40;
        dst[d4 + 3] = shadowA * 255;
        continue;
      }

      const nx = g.nx[i];
      const ny = g.ny[i];
      const nz = g.nz[i];

      // レンズの歪み：外向きの法線の分だけ内側の絵を拾うと、中央が拡大されて見える
      // 傾きが急な縁ほど強く歪むように、傾きをかけて使う
      const slope = Math.hypot(nx, ny); // 0＝平ら、1 に近いほど急
      const bend = g.refraction * slope * slope;
      const sx = x - nx * bend;
      const sy = y - ny * bend;
      const x0 = Math.max(0, Math.min(S - 2, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(S - 2, Math.floor(sy)));
      const fx = clamp01(sx - x0);
      const fy = clamp01(sy - y0);
      const p00 = (x0 + y0 * S) * 4;
      const p10 = p00 + 4;
      const p01 = p00 + S * 4;
      const p11 = p01 + 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const a00 = art[p00 + 3] * w00;
      const a10 = art[p10 + 3] * w10;
      const a01 = art[p01 + 3] * w01;
      const a11 = art[p11 + 3] * w11;
      const artA = (a00 + a10 + a01 + a11) / 255;
      const sumA = a00 + a10 + a01 + a11 || 1;
      const artR = (art[p00] * a00 + art[p10] * a10 + art[p01] * a01 + art[p11] * a11) / sumA / 255;
      const artG = (art[p00 + 1] * a00 + art[p10 + 1] * a10 + art[p01 + 1] * a01 + art[p11 + 1] * a11) / sumA / 255;
      const artB = (art[p00 + 2] * a00 + art[p10 + 2] * a10 + art[p01 + 2] * a01 + art[p11 + 2] * a11) / sumA / 255;

      // フチの色：指定の色に、近くの絵の色を少しにじませる
      const bleedA = g.bleedA[i];
      const bleedStrength = bleedA > 0.001 ? clamp01(bleedA * 1.6) * 0.55 : 0;
      const bleedDiv = bleedA > 0.001 ? bleedA : 1;
      const edgeR = borderR + (g.bleedR[i] / bleedDiv - borderR) * bleedStrength;
      const edgeG = borderG + (g.bleedG[i] / bleedDiv - borderG) * bleedStrength;
      const edgeB = borderB + (g.bleedB[i] / bleedDiv - borderB) * bleedStrength;

      // 樹脂を通すと色が濃く見えるので、絵の彩度を少し上げる
      const artLuma = artR * 0.3 + artG * 0.59 + artB * 0.11;
      const satR = clamp01(artLuma + (artR - artLuma) * 1.18);
      const satG = clamp01(artLuma + (artG - artLuma) * 1.18);
      const satB = clamp01(artLuma + (artB - artLuma) * 1.18);
      let r = edgeR + (satR - edgeR) * artA;
      let g2 = edgeG + (satG - edgeG) * artA;
      let b = edgeB + (satB - edgeB) * artA;
      let alpha = borderAlpha + (1 - borderAlpha) * artA;

      const tilt = 1 - nz; // 0＝真上を向いた平らな面、大きいほど縁に近い急な面
      const toward = nx * dirX + ny * dirY; // 光の来る側を向いているほど正、反対側は負
      const facing = slope > 0.001 ? toward / slope : 0; // 面が光のほうを向いている度合い（-1〜1）

      // 光の側の内側は暗くなる（樹脂の厚みの影）。上側の縁に濃い帯ができて、膨らんで見える
      const inner = Math.max(0, facing);
      const darkness = inner * slope * slope * (0.45 + 0.5 * p);
      const mul = 1 - clamp01(darkness) * 0.32;
      r *= mul;
      g2 *= mul;
      b *= mul;

      // 全体のグラデーション：光の反対側へ向かって明るくする
      const lift = clamp01(-toward) * 0.35;
      r += (1 - r) * lift * (0.3 + 0.7 * r);
      g2 += (1 - g2) * lift * (0.3 + 0.7 * g2);
      b += (1 - b) * lift * (0.3 + 0.7 * b);

      // 光の反対側の縁には、樹脂を通った光がたまって強く光る。ぷっくりシールらしさの大きな要素
      const far = Math.max(0, -facing);
      const pool = far * far * smoothstep(0.3, 0.85, slope) * (0.6 + 0.4 * p);
      r += (1 - r) * pool * (0.55 + 0.45 * r);
      g2 += (1 - g2) * pool * (0.55 + 0.45 * g2);
      b += (1 - b) * pool * (0.55 + 0.45 * b);

      // 縁の照り返し：急な面ほど白っぽく、不透明に見える
      const fresnel = tilt * tilt * 0.8;
      r += (1 - r) * fresnel * 0.45;
      g2 += (1 - g2) * fresnel * 0.45;
      b += (1 - b) * fresnel * 0.45;
      alpha += (1 - alpha) * clamp01(fresnel + tilt * 0.9);

      // ツヤ（三日月）：傾きが一定の帯だけを光らせると、輪郭に沿った弧になる。
      // 光の正面で太く、離れるほど細くして、両端がとがった形にする
      const taper = smoothstep(0.72, 0.985, facing);
      const halfWidth = bandWidth * taper;
      let gloss = 0;
      if (halfWidth > 0.001) {
        const bandCenter = 0.68;
        const band =
          smoothstep(bandCenter - halfWidth - edgeSoft, bandCenter - halfWidth + edgeSoft, slope) *
          (1 - smoothstep(bandCenter + halfWidth - edgeSoft, bandCenter + halfWidth + edgeSoft, slope));
        gloss += band * light.strength;
      }

      // ツヤ（点）：三日月の内側に置く丸い光。窓の映り込みのように見える
      const spot = nx * spotX + ny * spotY + nz * spotZ;
      gloss += smoothstep(0.9965 - edgeSoft * 0.3, 0.9965 + edgeSoft * 0.3, spot) * light.strength * 0.9;
      // ツヤのまわりのほんのりした明るさ
      gloss += Math.pow(Math.max(0, spot), 60) * 0.18 * light.strength;

      // 反対側の小さな三日月
      if (params.sparkle && far > 0) {
        const halfWidth2 = 0.025 * smoothstep(0.6, 0.98, far);
        const center2 = 0.8;
        if (halfWidth2 > 0.001) {
          const band2 =
            smoothstep(center2 - halfWidth2 - edgeSoft, center2 - halfWidth2 + edgeSoft, slope) *
            (1 - smoothstep(center2 + halfWidth2 - edgeSoft, center2 + halfWidth2 + edgeSoft, slope));
          gloss += band2 * 0.85 * light.strength;
        }
      }
      gloss = clamp01(gloss);
      r += (1 - r) * gloss;
      g2 += (1 - g2) * gloss;
      b += (1 - b) * gloss;
      alpha += (1 - alpha) * gloss;

      // 一番外側の細い線：これがあると透明なフチでも輪郭が見える
      const line = 1 - smoothstep(0, 1.6 * unit, g.dist[i]);
      const lineMul = 1 - line * 0.32;
      r *= lineMul;
      g2 *= lineMul;
      b *= lineMul;
      alpha += (1 - alpha) * line * 0.6;

      // 影の上にシールを重ねる
      const blobA = alpha * cov;
      const outA = blobA + shadowA * (1 - blobA);
      const shadowPart = shadowA * (1 - blobA);
      const div = outA || 1;
      dst[d4] = ((r * 255 * blobA + 40 * shadowPart) / div);
      dst[d4 + 1] = ((g2 * 255 * blobA + 30 * shadowPart) / div);
      dst[d4 + 2] = ((b * 255 * blobA + 40 * shadowPart) / div);
      dst[d4 + 3] = outA * 255;
    }
  }
  return out;
}
