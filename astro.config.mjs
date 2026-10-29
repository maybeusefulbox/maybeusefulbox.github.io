// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 公開先のドメイン（サイトマップや絶対URLの生成に使われる）
  site: 'https://maybeusefulbox.github.io',
  // リポジトリ名を「ユーザー名.github.io」にすると、サイトはドメイン直下（/）に置かれる。
  // 別の名前のリポジトリで公開するときは '/リポジトリ名/' に変える。
  base: '/',
});
