// サイト全体の設定。サイト名やメニュー、トップのコンテンツはここを編集すれば全ページに反映される。
import type { ImageMetadata } from 'astro';
import menu01 from '../assets/menu01.jpg';
import menu02 from '../assets/menu02.jpg';
import menu03 from '../assets/menu03.jpg';
import menu04 from '../assets/menu04.jpg';

export const SITE_NAME = 'たぶん便利BOX';
export const SITE_DESCRIPTION =
  '誰かの役に立つような立たないような気がするツールや素材を配布するサイトです。';

/** メニュー（ハンバーガーメニューとフッター）。path は BASE_URL からの相対パス */
export const nav = [
  { path: '', label: 'トップ' },
  { path: 'puffy/', label: 'ぷっくりシール風画像メーカー' },
  { path: 'badges/maker/', label: 'メダル風アイコンメーカー' },
  { path: 'logo/', label: 'テキストSVGロゴメーカー' },
  { path: 'line/', label: 'LINEスタンプ' },
  { path: 'terms/', label: '利用規約' },
];

/** フッターの下の段に小さく出すリンク（サイトの決まりごと・運営情報のページ） */
export const footerLinks = [
  { path: 'about/', label: '運営者情報' },
  { path: 'privacy/', label: 'プライバシーポリシー' },
  { path: 'contact/', label: 'お問い合わせ' },
];

/**
 * 運営者の情報。運営者情報・プライバシーポリシー・お問い合わせのページで使う。
 * 空欄（''）のところは、ページに「準備中」などと表示される
 */
export const OPERATOR = {
  /** 運営者名（ハンドルネームで OK） */
  name: 'たぶん便利BOX',
  /** サイトを開設した年月 */
  since: '2026年10月',
  /** お問い合わせフォーム（Google フォームなど）の URL */
  contactFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf8rxFTg7wZj2ebDu4Ybe_EqY4v4mK_5FHyuvHQltOZ48xLdg/viewform',
};

/**
 * アクセス解析の設定。空欄（''）のあいだは、ページに何も出さない。
 * ここに書き込むだけで全ページに反映され、プライバシーポリシーの文面も自動で切り替わる
 */
export const ANALYTICS = {
  /** Google アナリティクスの測定 ID（G- から始まる英数字） */
  gaId: 'G-LTS80BBSB7',
  /** Search Console の確認コード（HTML タグ方式の content="◯◯" の◯◯の部分） */
  searchConsole: 'AukbcOHesDPRZqyNMVnx6S9aL1ezjpVgG29HFDEwCV8',
};

/**
 * トップページのコンテンツタイル。
 * href が null のものは「準備中」として表示される（リンクにならない）。
 * label の \n は改行になる。
 * 画像ありのタイルは、label の \u200B（見えない区切り）の位置で折り返す（画面が狭いときだけ）。
 * icon を指定すると、タイルに画像が表示される（画像は src/assets/ に置いて import する）。
 * desc は、名前の下に出す短い説明。
 */
export const contents: { label: string; href: string | null; icon?: ImageMetadata; desc?: string }[] = [
  { label: 'ぷっくりシール風\u200B画像メーカー', href: 'puffy/', icon: menu01, desc: '画像をぷっくりツヤツヤに加工できます。' },
  { label: 'メダル風\u200Bアイコンメーカー', href: 'badges/maker/', icon: menu02, desc: '缶バッジのような、ツヤツヤアイコンを作れます。' },
  { label: 'テキストSVG\u200Bロゴメーカー', href: 'logo/', icon: menu03, desc: 'お好きなフォントで簡単にロゴ画像を作れます。' },
  { label: 'LINEスタンプ', href: 'line/', icon: menu04, desc: '当サイトオリジナルLINEスタンプです。' },
];

/** 更新履歴（新しいものを上に足していく）。今はトップに表示していない */
export const updates = [
  { date: '2026-11-12', text: '画像メーカーの名前を「ぷっくりシール風画像メーカー」に変えました' },
  { date: '2026-11-11', text: 'テキストSVGロゴメーカーを公開しました' },
  { date: '2026-11-11', text: 'グロッシーバッジ素材の配布を終了しました（メダル風アイコンメーカーで作れます）' },
  { date: '2026-10-30', text: 'サイト名を「たぶん便利BOX」にして、デザインを新しくしました' },
  { date: '2026-10-29', text: 'サイトのURLを https://maybeusefulbox.github.io/ に移転しました' },
  { date: '2026-10-06', text: 'バッジの色変更ツールを公開しました' },
  { date: '2026-10-06', text: 'グロッシーバッジ素材の配布を始めました' },
  { date: '2026-10-05', text: 'ぷっくりシール風画像メーカーを公開しました' },
  { date: '2026-10-05', text: 'サイトを開設しました' },
];
