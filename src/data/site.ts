// サイト全体の設定。サイト名やメニュー、トップのコンテンツはここを編集すれば全ページに反映される。
import type { ImageMetadata } from 'astro';
import tilePuffy from '../assets/tile-puffy.png';

export const SITE_NAME = 'たぶん便利BOX';
export const SITE_DESCRIPTION =
  '誰かの役に立つような立たないような気がするツールや素材を配布するサイトです。';

/** メニュー（ハンバーガーメニューとフッター）。path は BASE_URL からの相対パス */
export const nav = [
  { path: '', label: 'トップ' },
  { path: 'puffy/', label: 'ボンドロ風画像メーカー' },
  { path: 'badges/', label: 'グロッシーバッジ素材' },
  { path: 'badges/maker/', label: 'バッジの色変更ツール' },
  { path: 'line/', label: 'LINEスタンプ' },
  { path: 'terms/', label: '利用規約' },
];

/**
 * トップページのコンテンツタイル。
 * href が null のものは「準備中」として表示される（リンクにならない）。
 * label の \n は改行になる。
 * 画像ありのタイルは、label の \u200B（見えない区切り）の位置で折り返す（画面が狭いときだけ）。
 * icon を指定すると、タイルに画像が表示される（画像は src/assets/ に置いて import する）。
 */
export const contents: { label: string; href: string | null; icon?: ImageMetadata }[] = [
  { label: 'ボンドロ風\u200B画像メーカー', href: 'puffy/', icon: tilePuffy },
  { label: 'よくある\nショート動画\nメーカー', href: null },
  { label: '副業体験記', href: null },
  { label: 'LINE\nスタンプ', href: 'line/' },
];

/** 更新履歴（新しいものを上に足していく）。今はトップに表示していない */
export const updates = [
  { date: '2026-10-30', text: 'サイト名を「たぶん便利BOX」にして、デザインを新しくしました' },
  { date: '2026-10-29', text: 'サイトのURLを https://maybeusefulbox.github.io/ に移転しました' },
  { date: '2026-10-06', text: 'バッジの色変更ツールを公開しました' },
  { date: '2026-10-06', text: 'グロッシーバッジ素材の配布を始めました' },
  { date: '2026-10-05', text: 'ボンドロ風画像メーカーを公開しました' },
  { date: '2026-10-05', text: 'サイトを開設しました' },
];
