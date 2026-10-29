// サイト全体の設定。サイト名やナビの項目、更新履歴はここを編集すれば全ページに反映される。

export const SITE_NAME = 'tool_site';
export const SITE_TAGLINE = '小説投稿者のためのフリー素材とアイコンツール';

/** ヘッダーのナビ。path は BASE_URL からの相対パス */
export const nav = [
  { path: '', label: 'トップ', color: '#f06aa8' },
  { path: 'badges/', label: 'バッジ素材', color: '#3a8ee6' },
  { path: 'badges/maker/', label: '色変更ツール', color: '#2fbf9b' },
  { path: 'puffy/', label: 'ぷっくりアイコン', color: '#f59a23' },
  { path: 'terms/', label: '利用規約', color: '#9b6ae6' },
];

/** 更新履歴（新しいものを上に足していく） */
export const updates = [
  { date: '2026-10-29', text: 'サイトのURLを https://maybeusefulbox.github.io/ に移転しました' },
  { date: '2026-10-06', text: 'バッジの色変更ツールを公開しました' },
  { date: '2026-10-06', text: 'グロッシーバッジ素材の配布を始めました' },
  { date: '2026-10-05', text: 'ぷっくりアイコンメーカーを公開しました' },
  { date: '2026-10-05', text: 'サイトを開設しました' },
];
