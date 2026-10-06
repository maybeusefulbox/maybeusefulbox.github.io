// 配布用 PNG ファイルを生成するエンドポイント。
// SVG と同じ文字列を sharp（画像処理ライブラリ）でラスタライズ（ピクセル画像に変換）する。
// SVG が使えないサービス（SNS のアイコン設定など）向け。
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { badges, PNG_SIZE, type BadgeItem } from '../../data/badges';
import { renderBadgeSvg } from '../../lib/badge-svg';

export const getStaticPaths = (() =>
  badges.map((badge) => ({ params: { id: badge.id }, props: { badge } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { badge } = props as { badge: BadgeItem };
  // size を指定して、最初から 512px で描かせる（小さく描いてから拡大するとぼやけるため）
  const svg = renderBadgeSvg({
    color: badge.color,
    motif: badge.motif,
    title: badge.name,
    size: PNG_SIZE,
    idPrefix: badge.id,
  });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
