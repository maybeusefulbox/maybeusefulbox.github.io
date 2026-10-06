// 配布するバッジ素材の一覧。
// ここに1行足すだけで、一覧ページへの表示と .svg / .png ファイルの生成が自動で行われる。
import type { Motif } from '../lib/badge-svg';

export interface BadgeItem {
  /** ファイル名や URL に使う英数字の名前 */
  id: string;
  /** 表示名 */
  name: string;
  color: string;
  motif: Motif;
}

const colors = [
  { key: 'blue', name: 'ブルー', hex: '#3a8ee6' },
  { key: 'pink', name: 'ピンク', hex: '#f06aa8' },
  { key: 'mint', name: 'ミント', hex: '#2fbf9b' },
  { key: 'orange', name: 'オレンジ', hex: '#f59a23' },
  { key: 'purple', name: 'パープル', hex: '#9b6ae6' },
  { key: 'red', name: 'レッド', hex: '#e64545' },
];

const motifs: { key: Motif; name: string }[] = [
  { key: 'star', name: '星' },
  { key: 'heart', name: 'ハート' },
];

// 色 × モチーフの組み合わせをすべて作る
export const badges: BadgeItem[] = motifs.flatMap((m) =>
  colors.map((c) => ({
    id: `${m.key}-${c.key}`,
    name: `${c.name}の${m.name}`,
    color: c.hex,
    motif: m.key,
  })),
);

export { motifs };

/** 配布する PNG の一辺のサイズ（px） */
export const PNG_SIZE = 512;
