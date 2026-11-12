// SNS でシェアしたときに出る画像（OGP 画像）を作るスクリプト。
// 1200×630 の JPEG を public/ogp/ に保存する。
//
// ページを増やしたとき・画像やページ名を変えたときだけ実行する：
//   node scripts/build-ogp.mjs
//
// なぜスクリプトで作るのか：ページごとに同じレイアウトの画像が必要で、
// 手作業だと作り直しが大変なため。
// なぜ文字をパス（図形）にするのか：SVG の <text> のままだと、画像を作るパソコンに
// 入っているフォントで描かれてしまい、見た目が変わるため。サイトと同じ丸ゴシックで描く。
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import opentype from 'opentype.js';

const OUT = 'public/ogp';
const W = 1200;
const H = 630;

// サイトの色（BaseLayout.astro の :root と合わせる）
const C = {
  bg: '#fbf7f3',
  text: '#3b3330',
  muted: '#7a706b',
  accent: '#a0673f',
  line: '#e6dfda',
};

const SITE_NAME = 'たぶん便利BOX';

// 作る画像の一覧。lines は大きく出すページ名（1要素＝1行）
const PAGES = [
  { key: 'puffy', image: 'src/assets/menu01.jpg', lines: ['ぷっくりシール風', '画像メーカー'], sub: '画像をぷっくりツヤツヤに' },
  { key: 'badges', image: 'src/assets/menu02.jpg', lines: ['メダル風', 'アイコンメーカー'], sub: '缶バッジ風のアイコンを作れる' },
  { key: 'logo', image: 'src/assets/menu03.jpg', lines: ['テキストSVG', 'ロゴメーカー'], sub: '好きなフォントでロゴ画像に' },
  { key: 'line', image: 'src/assets/menu04.jpg', lines: ['LINEスタンプ'], sub: 'オリジナルスタンプ配信中' },
];

const font = opentype.parse((await readFile('public/fonts/zen-maru.woff')).buffer);

/** 文字を SVG のパスにする。align で左寄せ・中央寄せを選ぶ */
function textPath(str, x, y, size, fill, align = 'left') {
  const width = font.getAdvanceWidth(str, size);
  const left = align === 'center' ? x - width / 2 : x;
  // 位置を小数にして getPath すると、opentype.js が NaN（壊れた数字）を出すことがある。
  // そのため文字は (0,0) で図形にして、translate（平行移動）で目的の位置へ動かす
  const d = font.getPath(str, 0, 0, size).toPathData(2);
  if (d.includes('NaN')) throw new Error(`「${str}」をうまく図形にできませんでした`);
  return { svg: `<path transform="translate(${left.toFixed(2)} ${y.toFixed(2)})" d="${d}" fill="${fill}"/>`, width };
}

/** 文字が maxWidth に収まる大きさを返す（大きすぎるときだけ縮める） */
function fitSize(lines, size, maxWidth) {
  const widest = Math.max(...lines.map((l) => font.getAdvanceWidth(l, size)));
  return widest > maxWidth ? Math.floor((size * maxWidth) / widest) : size;
}

// ロゴ（箱の絵）。線の色をサイトの文字色に変える
const logoSvg = (await readFile('src/assets/logo.svg', 'utf8')).replaceAll('stroke:black', `stroke:${C.text}`);
async function logoPng(size) {
  return sharp(Buffer.from(logoSvg), { density: 300 }).resize(size, size).png().toBuffer();
}

/** 角を丸めた画像を作る */
async function roundedImage(file, size, radius) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`,
  );
  // 画像の角が白いと丸みが見えないので、細い枠線も描く
  const border = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="1.5" y="1.5" width="${size - 3}" height="${size - 3}" rx="${radius - 1.5}" fill="none" stroke="${C.line}" stroke-width="3"/></svg>`,
  );
  return sharp(file)
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }, { input: border }])
    .png()
    .toBuffer();
}

/** 背景（クリーム色＋外枠） */
function frame(inner) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="28" fill="#fff" stroke="${C.line}" stroke-width="3"/>
  ${inner}
</svg>`);
}

/** ツールのページ用：左に作例画像、右にページ名 */
async function buildPage(p) {
  const imgSize = 470;
  const imgX = 70;
  const imgY = (H - imgSize) / 2;
  const textX = imgX + imgSize + 60;
  const maxW = W - textX - 70;

  const size = fitSize(p.lines, 64, maxW);
  const lineH = size * 1.3;
  const titleTop = 250 - ((p.lines.length - 1) * lineH) / 2;
  const parts = [];
  p.lines.forEach((l, i) => parts.push(textPath(l, textX, titleTop + i * lineH, size, C.text).svg));
  // ページ名の下の線と説明
  const lineY = titleTop + (p.lines.length - 1) * lineH + 40;
  parts.push(`<rect x="${textX}" y="${lineY}" width="80" height="6" rx="3" fill="${C.accent}"/>`);
  parts.push(textPath(p.sub, textX, lineY + 66, fitSize([p.sub], 30, maxW), C.muted).svg);
  // 右下にサイト名（ロゴの横）
  const nameSize = 34;
  const name = textPath(SITE_NAME, 0, 0, nameSize, C.text);
  const nameX = W - 70 - name.width;
  parts.push(textPath(SITE_NAME, nameX, H - 82, nameSize, C.text).svg);

  await sharp(frame(parts.join('\n')))
    .composite([
      { input: await roundedImage(p.image, imgSize, 32), left: imgX, top: imgY },
      { input: await logoPng(72), left: Math.round(nameX - 84), top: H - 82 - 58 },
    ])
    .jpeg({ quality: 88 })
    .toFile(`${OUT}/${p.key}.jpg`);
}

/** トップ・その他のページ用：ロゴとサイト名を中央に、下に4つのメニュー画像 */
async function buildDefault() {
  const parts = [];
  parts.push(textPath(SITE_NAME, W / 2 + 60, 175, 76, C.text, 'center').svg);
  parts.push(textPath('役に立つような立たないようなツールと素材', W / 2 + 60, 235, 28, C.muted, 'center').svg);

  const thumb = 220;
  const gap = 36;
  const rowX = (W - (thumb * 4 + gap * 3)) / 2;
  const thumbs = await Promise.all(PAGES.map((p) => roundedImage(p.image, thumb, 24)));
  // ロゴはサイト名の左に置く
  const titleW = font.getAdvanceWidth(SITE_NAME, 76);
  const logoX = Math.round(W / 2 + 60 - titleW / 2 - 150);

  await sharp(frame(parts.join('\n')))
    .composite([
      { input: await logoPng(140), left: logoX, top: 70 },
      ...thumbs.map((t, i) => ({ input: t, left: Math.round(rowX + i * (thumb + gap)), top: 300 })),
    ])
    .jpeg({ quality: 88 })
    .toFile(`${OUT}/default.jpg`);
}

await mkdir(OUT, { recursive: true });
await buildDefault();
for (const p of PAGES) await buildPage(p);
console.log(`${PAGES.length + 1} 枚の画像を ${OUT}/ に作りました`);
