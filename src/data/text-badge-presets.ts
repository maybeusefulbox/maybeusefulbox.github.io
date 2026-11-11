// 文字入りバッジのプリセット（最初から選べる見本）。
// ここに1件足すと、ツールのプリセットのボタンが増える。
// font は src/lib/fonts.ts の key、textColor は 'auto'（自動）/'white'（白）/'dark'（濃い色）
import type { TextColorMode } from '../lib/text-badge-svg';

export interface TextBadgePreset {
  key: string;
  name: string;
  color: string;
  top: string;
  bottom: string;
  center: string;
  font: string;
  textColor: TextColorMode;
}

export const TEXT_BADGE_PRESETS: TextBadgePreset[] = [
  { key: 'new', name: '新着マーク', color: '#3a8ee6', top: 'MAYBE USEFUL BOX', bottom: '★ ★ ★', center: 'NEW', font: 'fredoka', textColor: 'auto' },
  { key: 'gold', name: '1位メダル', color: '#e6b422', top: 'BEST SELECTION', bottom: '2026', center: '1', font: 'cinzel', textColor: 'auto' },
  { key: 'silver', name: '2位メダル', color: '#aeb6c2', top: 'BEST SELECTION', bottom: '2026', center: '2', font: 'cinzel', textColor: 'auto' },
  { key: 'bronze', name: '3位メダル', color: '#c8814a', top: 'BEST SELECTION', bottom: '2026', center: '3', font: 'cinzel', textColor: 'auto' },
  { key: 'oshi', name: '推しバッジ', color: '#f06aa8', top: '推し活がんばってます', bottom: '♡ ♡ ♡', center: '推し', font: 'mplus-rounded', textColor: 'auto' },
];
