// 文字入りバッジで選べるフォントの一覧と、フォントを読み込む処理。
// フォントのファイルは public/fonts/ にあり、scripts/build-fonts.mjs で作っている。
//
// フォントは「選ばれたときに初めて」読み込む。日本語フォントは1つ 0.5〜0.9MB あるので、
// ページを開いた時点で全部読み込むと重くなるため。
// opentype.js（フォントを読む道具）も、フォントを初めて読み込むときに一緒に読み込む（import()）。
// ここで普通に import すると、フォント一覧を使うだけのサーバー側の処理でも読み込まれてしまうため
import type { Font } from 'opentype.js';

export interface BadgeFont {
  /** ファイル名（public/fonts/◯◯.woff）にも使う英数字の名前 */
  key: string;
  /** 選択肢に出す名前 */
  name: string;
  /** ja：日本語フォント（英字・記号も入っている）、en：英字だけのフォント */
  lang: 'ja' | 'en';
  /** 利用規約に書くライセンス表記用 */
  credit: string;
}

export const BADGE_FONTS: BadgeFont[] = [
  { key: 'zen-maru', name: '丸ゴシック（Zen Maru Gothic）', lang: 'ja', credit: 'Zen Maru Gothic' },
  { key: 'mplus-rounded', name: 'ポップ（M PLUS Rounded 1c）', lang: 'ja', credit: 'M PLUS Rounded 1c' },
  { key: 'dela-gothic', name: '極太（Dela Gothic One）', lang: 'ja', credit: 'Dela Gothic One' },
  { key: 'fredoka', name: '英字・まるい（Fredoka）', lang: 'en', credit: 'Fredoka' },
  { key: 'lilita', name: '英字・ポップ（Lilita One）', lang: 'en', credit: 'Lilita One' },
  { key: 'cinzel', name: '英字・クラシック（Cinzel）', lang: 'en', credit: 'Cinzel' },
];

/**
 * 選んだフォントに入っていない文字（英字フォントでの日本語や★など）を代わりに描くフォント。
 * 必要になったときだけ読み込まれる
 */
export const FALLBACK_FONT_KEY = 'zen-maru';

// 読み込み中・読み込み済みのフォントを覚えておき、同じフォントを2回ダウンロードしないようにする
const cache = new Map<string, Promise<Font>>();

export function loadFont(key: string): Promise<Font> {
  let p = cache.get(key);
  if (!p) {
    const url = `${import.meta.env.BASE_URL}fonts/${key}.woff`;
    p = Promise.all([
      import('opentype.js'),
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`${url} : ${res.status}`);
        return res.arrayBuffer();
      }),
    ]).then(([opentype, buf]) => opentype.parse(buf));
    // 失敗したときは覚えておかず、次に選んだときにもう一度読み込めるようにする
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}
