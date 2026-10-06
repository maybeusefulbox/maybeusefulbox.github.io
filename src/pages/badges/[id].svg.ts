// 配布用 SVG ファイルを生成する「エンドポイント」。
// ファイル名の [id] の部分が getStaticPaths の値に置き換わり、
// ビルド時に /badges/star-blue.svg のような静的ファイルが素材の数だけ作られる。
import type { APIRoute, GetStaticPaths } from 'astro';
import { badges, type BadgeItem } from '../../data/badges';
import { renderBadgeSvg } from '../../lib/badge-svg';

export const getStaticPaths = (() =>
  badges.map((badge) => ({ params: { id: badge.id }, props: { badge } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { badge } = props as { badge: BadgeItem };
  const svg = renderBadgeSvg({
    color: badge.color,
    motif: badge.motif,
    title: badge.name,
    // 大きさの指定がない SVG は、ソフトによって変な大きさで開かれるため既定値を入れておく
    // （viewBox があるので、使う側で自由に拡大・縮小できる）
    size: 256,
    idPrefix: badge.id, // ファイル単体なので、id は素材ごとに固定でよい
  });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
