// 文字入りバッジ用のフォントを用意するスクリプト。
// Google Fonts の配布元（github.com/google/fonts）からフォントを取得し、
// 使う文字だけに絞って（サブセット化）WOFF 形式で public/fonts/ に保存する。
//
// フォントを追加・変更するときだけ実行する（ふだんのビルドでは使わない）：
//   node scripts/build-fonts.mjs
//
// なぜ絞るのか：日本語フォントは数MBあり、そのままだとページが重くなるため。
// なぜ WOFF なのか：文字をパス化する opentype.js は WOFF2 を読めないが、WOFF なら読めて TTF より軽いため。
import { mkdir, writeFile } from 'node:fs/promises';
import subsetFont from 'subset-font';
import opentype from 'opentype.js';

let oflBody; // OFL の本文（最初に取得できたライセンス文から取り出す）

const SRC = 'https://raw.githubusercontent.com/google/fonts/main/ofl';
const OUT = 'public/fonts';

// ja: true の日本語フォントは、下の JA_CHARS に絞る。英字フォントは入っている文字をすべて残す
// axes: 太さなどを変えられる「可変フォント」は、使う太さに固定してから保存する
const FONTS = [
  { key: 'zen-maru', dir: 'zenmarugothic', file: 'ZenMaruGothic-Bold.ttf', ja: true },
  { key: 'mplus-rounded', dir: 'mplusrounded1c', file: 'MPLUSRounded1c-ExtraBold.ttf', ja: true },
  { key: 'dela-gothic', dir: 'delagothicone', file: 'DelaGothicOne-Regular.ttf', ja: true },
  { key: 'fredoka', dir: 'fredoka', file: 'Fredoka[wdth,wght].ttf', axes: { wght: 700, wdth: 100 } },
  { key: 'lilita', dir: 'lilitaone', file: 'LilitaOne-Regular.ttf' },
  { key: 'cinzel', dir: 'cinzel', file: 'Cinzel[wght].ttf', axes: { wght: 800 } },
];

// 日本語フォントに残す文字：Shift_JIS で表せる文字（英数字・記号・かな・JIS第1水準の漢字 約3000字）
// ＋よく使う記号。Shift_JIS の全コードを順に文字へ変換して集める。
// 第2水準（めずらしい漢字 約3400字）まで入れると、ファイルが約2倍の重さになる
const INCLUDE_LEVEL2 = false; // true にすると第2水準も入る
const LEVEL1_END = 0x9872; // 第1水準の最後の文字のコード

function jisChars() {
  const dec = new TextDecoder('shift_jis', { fatal: true });
  let s = '';
  for (let c = 0x20; c < 0x7f; c++) s += String.fromCharCode(c);
  for (let hi = 0x81; hi <= 0xef; hi++) {
    if (hi >= 0xa0 && hi <= 0xdf) continue; // 半角カナの範囲は飛ばす
    for (let lo = 0x40; lo <= 0xfc; lo++) {
      if (lo === 0x7f) continue;
      if (!INCLUDE_LEVEL2 && hi * 256 + lo > LEVEL1_END) continue;
      try {
        s += dec.decode(new Uint8Array([hi, lo]));
      } catch {
        // 文字が割り当てられていないコードは飛ばす
      }
    }
  }
  return s + '♡♥♪♫☆★✿❀✦✧♛♚・ー〜～！？';
}
const JA_CHARS = jisChars();

await mkdir(OUT, { recursive: true });
for (const f of FONTS) {
  const url = `${SRC}/${f.dir}/${encodeURIComponent(f.file)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  const ttf = Buffer.from(await res.arrayBuffer());

  const options = { targetFormat: 'woff' };
  if (f.axes) options.variationAxes = f.axes;
  // 英字フォントは、入っている文字をすべて残すため、ASCII〜ラテン拡張の範囲を指定する
  const chars = f.ja
    ? JA_CHARS
    : Array.from({ length: 0x250 - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('') + '–—‘’“”•…★☆♡♥';
  const woff = await subsetFont(ttf, chars, options);
  await writeFile(`${OUT}/${f.key}.woff`, woff);

  // OFL では、フォントを配布するときにライセンス文を一緒に置く決まりがある。
  // 配布元にライセンス文のファイルがないフォントは、フォント内の著作権表示＋OFL の本文で作る
  const lic = await fetch(`${SRC}/${f.dir}/OFL.txt`);
  let licText;
  if (lic.ok) {
    licText = await lic.text();
    oflBody ??= licText.slice(licText.indexOf('This Font Software is licensed'));
  } else {
    const font = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.length));
    const copyright = font.names.copyright?.en ?? font.names.windows?.copyright?.en ?? '';
    if (!oflBody) throw new Error('OFL 本文が未取得です。ライセンス文のあるフォントを先に並べてください');
    licText = `${copyright}\n\n${oflBody}`;
  }
  await writeFile(`${OUT}/${f.key}-OFL.txt`, licText);

  console.log(`${f.key}: ${(ttf.length / 1024).toFixed(0)}KB → ${(woff.length / 1024).toFixed(0)}KB`);
}
console.log(`日本語フォントに残した文字数：${[...JA_CHARS].length}`);
