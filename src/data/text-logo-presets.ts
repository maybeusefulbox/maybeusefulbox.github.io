// テキストSVGロゴメーカーのプリセット（ワンクリックで雰囲気を変える見本）。
// ここに1件足すと、ツールのプリセットのボタンが増える。文字（テキスト）は変えずに、見た目だけを切り替える。
// font は src/lib/fonts.ts の key。太さや距離の単位は px（文字の大きさ 100px のとき）
import type { Outline, Shadow } from '../lib/text-logo-svg';

export interface TextLogoStyle {
  font: string;
  color: string;
  tracking: number;
  lineHeight: number;
  outline: Outline | null;
  outline2: Outline | null;
  shadow: Shadow | null;
  gloss: boolean;
  background: string | null;
}

export interface TextLogoPreset extends TextLogoStyle {
  key: string;
  name: string;
}

export const TEXT_LOGO_PRESETS: TextLogoPreset[] = [
  {
    key: 'simple', name: 'シンプル',
    font: 'zen-maru', color: '#3b2f2a', tracking: 0.04, lineHeight: 1.25,
    outline: null, outline2: null, shadow: null, gloss: false, background: null,
  },
  {
    key: 'pop', name: 'ポップ',
    font: 'mplus-rounded', color: '#ff5fa2', tracking: 0.02, lineHeight: 1.2,
    outline: { color: '#ffffff', width: 6 }, outline2: { color: '#5a2d82', width: 4 },
    shadow: { type: 'hard', color: '#5a2d82', offset: 5, blur: 0 }, gloss: true, background: null,
  },
  {
    key: 'glossy', name: 'ツヤツヤ',
    font: 'fredoka', color: '#3a8ee6', tracking: 0.02, lineHeight: 1.2,
    outline: { color: '#ffffff', width: 5 }, outline2: { color: '#1f4f8a', width: 3 },
    shadow: { type: 'soft', color: '#1f4f8a', offset: 4, blur: 4 }, gloss: true, background: null,
  },
  {
    key: 'retro', name: 'レトロ',
    font: 'righteous', color: '#f4a62a', tracking: 0.03, lineHeight: 1.2,
    outline: { color: '#7a3b1d', width: 4 }, outline2: null,
    shadow: { type: 'hard', color: '#7a3b1d', offset: 7, blur: 0 }, gloss: false, background: '#fff4dc',
  },
  {
    key: 'uchiwa', name: 'うちわ風',
    font: 'dela-gothic', color: '#ff2d95', tracking: 0, lineHeight: 1.15,
    outline: { color: '#ffffff', width: 7 }, outline2: { color: '#222222', width: 4 },
    shadow: null, gloss: false, background: null,
  },
  {
    key: 'mincho', name: '上品',
    font: 'shippori-mincho', color: '#2b2b2b', tracking: 0.12, lineHeight: 1.4,
    outline: null, outline2: null,
    shadow: { type: 'soft', color: '#000000', offset: 2, blur: 3 }, gloss: false, background: null,
  },
  {
    key: 'handwrite', name: '手書き',
    font: 'yusei-magic', color: '#4a7c59', tracking: 0.02, lineHeight: 1.3,
    outline: { color: '#ffffff', width: 5 }, outline2: null,
    shadow: { type: 'hard', color: '#c9dccb', offset: 4, blur: 0 }, gloss: false, background: null,
  },
];
