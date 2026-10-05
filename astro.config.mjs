// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 公開先のドメイン（サイトマップや絶対URLの生成に使われる）
  site: 'https://ryokokitayama.github.io',
  // GitHub Pages ではサイトが /リポジトリ名/ 以下に置かれるため、その分を指定する
  // 末尾の / を付けておくと、BASE_URL + 'favicon.svg' のように素直に連結できる
  base: '/tool_site/',
});
