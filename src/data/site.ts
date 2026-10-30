// サイト全体の設定。サイト名やメニュー、トップのコンテンツはここを編集すれば全ページに反映される。

export const SITE_NAME = 'たぶん便利BOX';
export const SITE_DESCRIPTION =
  '誰かの役に立つような立たないような気がするツールや素材を配布するサイトです。';

/** メニュー（ハンバーガーメニューとフッター）。path は BASE_URL からの相対パス */
export const nav = [
  { path: '', label: 'トップ' },
  { path: 'puffy/', label: 'ぷっくりアイコンメーカー' },
  { path: 'badges/', label: 'グロッシーバッジ素材' },
  { path: 'badges/maker/', label: 'バッジの色変更ツール' },
  { path: 'terms/', label: '利用規約' },
];

/**
 * トップページのコンテンツタイル。
 * href が null のものは「準備中」として表示される（リンクにならない）。
 * label の \n は改行になる。
 */
export const contents: { label: string; href: string | null }[] = [
  { label: 'ボンドロ', href: 'puffy/' },
  { label: 'よくある\nショート動画\nメーカー', href: null },
  { label: '副業体験記', href: null },
  { label: 'LINE\nスタンプ', href: null },
];

/** 更新履歴（新しいものを上に足していく）。今はトップに表示していない */
export const updates = [
  { date: '2026-10-30', text: 'サイト名を「たぶん便利BOX」にして、デザインを新しくしました' },
  { date: '2026-10-29', text: 'サイトのURLを https://maybeusefulbox.github.io/ に移転しました' },
  { date: '2026-10-06', text: 'バッジの色変更ツールを公開しました' },
  { date: '2026-10-06', text: 'グロッシーバッジ素材の配布を始めました' },
  { date: '2026-10-05', text: 'ぷっくりアイコンメーカーを公開しました' },
  { date: '2026-10-05', text: 'サイトを開設しました' },
];
