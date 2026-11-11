// アフィリエイト広告の一覧。
//
// ■ 広告の足し方
//   1. ASP（A8.net、もしもアフィリエイトなど）の管理画面で、貼りたい広告の「広告コード（HTML）」をコピーする
//   2. 下の ads の [ ] の中に、次の形で1件足す（コードは ` ` で囲んで、そのまま貼る）
//
//      {
//        place: 'badges',              // どのページに出すか（下の AdPlace を参照）
//        lead: '缶バッジにするなら',      // 広告の上に出す一言（なくても OK）
//        html: `ここにASPのコードをそのまま貼る`,
//      },
//
//   3. 「公開して」で反映される
//
// ■ 決まりごと
//   - ASP のコードは、中身を書き換えずにそのまま貼る（書き換えると、成果が計測されないことがある）
//   - 「PR」の表記と、リンクへの rel="sponsored" の追加は、表示する部品（AdSlot.astro）が自動で行う
//   - 広告を止めたいときは、その1件を消すか、enabled: false を付ける

/** 広告を出す場所 */
export type AdPlace =
  | 'top' // トップページ（いちばん下、フッターの上）
  | 'puffy' // ボンドロ風画像メーカー（ツールの下）
  | 'badges' // メダル風アイコンメーカー（ツールの下）
  | 'logo' // テキストSVGロゴメーカー（ツールの下）
  | 'line'; // LINEスタンプ（スタンプ一覧の下）

export interface Ad {
  place: AdPlace;
  /** 広告の名前（自分用のメモ。画面には出ない） */
  name?: string;
  /** ASP からコピーした広告コード（HTML） */
  html: string;
  /** 広告の上に出す一言（例：「缶バッジにするなら」） */
  lead?: string;
  /** false にすると表示しない（一時的に止めたいとき用） */
  enabled?: boolean;
}

// 楽天（A8.net 経由・468×60 の横長バナー）。いくつかのページで同じものを使うので、ここに1回だけ書く
const RAKUTEN_WIDE = `<a href="https://rpx.a8.net/svt/ejp?a8mat=4BGINR+7NNPV6+2HOM+61Z81&rakuten=y&a8ejpredirect=http%3A%2F%2Fhb.afl.rakuten.co.jp%2Fhgc%2F0ea62065.34400275.0ea62066.204f04c0%2Fa26111181125_4BGINR_7NNPV6_2HOM_61Z81%3Fpc%3Dhttp%253A%252F%252Fwww.rakuten.co.jp%252F%26m%3Dhttp%253A%252F%252Fm.rakuten.co.jp%252F" rel="nofollow">
<img src="http://hbb.afl.rakuten.co.jp/hsb/0eb4bbdb.d3e5aa19.0eb4bbaa.95151395/" border="0"></a>
<img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4BGINR+7NNPV6+2HOM+61Z81" alt="">`;

export const ads: Ad[] = [
  // ---------- トップページ ----------
  { place: 'top', name: '楽天（横長）', html: RAKUTEN_WIDE },

  // ---------- ボンドロ風画像メーカー ----------
  {
    place: 'puffy',
    name: 'Cherish Palette（300×250）',
    html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BGINR+9A075E+2ZQM+TTLOX" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=261111159561&wid=001&eno=01&mid=s00000013963005009000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www17.a8.net/0.gif?a8mat=4BGINR+9A075E+2ZQM+TTLOX" alt="">`,
  },
  {
    place: 'puffy',
    name: 'colone（300×250）',
    html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BGINR+99ERJM+2ULW+C0B9T" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www24.a8.net/svt/bgt?aid=261111159560&wid=001&eno=01&mid=s00000013298002017000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www12.a8.net/0.gif?a8mat=4BGINR+99ERJM+2ULW+C0B9T" alt="">`,
  },
  { place: 'puffy', name: '楽天（横長）', html: RAKUTEN_WIDE },

  // ---------- メダル風アイコンメーカー ----------
  {
    place: 'badges',
    name: 'FaNeMa（300×250）',
    html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BGINR+9ALMR6+5FAA+5YZ75" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www24.a8.net/svt/bgt?aid=261111159562&wid=001&eno=01&mid=s00000025309001003000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www12.a8.net/0.gif?a8mat=4BGINR+9ALMR6+5FAA+5YZ75" alt="">`,
  },
  {
    place: 'badges',
    name: 'あるる（300×250）',
    html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BGINR+A8JC8I+2W9M+HWXLD" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www26.a8.net/svt/bgt?aid=261111159619&wid=001&eno=01&mid=s00000013513003009000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4BGINR+A8JC8I+2W9M+HWXLD" alt="">`,
  },
  { place: 'badges', name: '楽天（横長）', html: RAKUTEN_WIDE },

  // ---------- テキストSVGロゴメーカー ----------
  {
    place: 'logo',
    name: 'maniau（300×250）',
    html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BGINR+ASS2SY+2UOY+5Z6WX" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www25.a8.net/svt/bgt?aid=261111159653&wid=001&eno=01&mid=s00000013309001004000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=4BGINR+ASS2SY+2UOY+5Z6WX" alt="">`,
  },
  {
    place: 'logo',
    name: 'BASE（300×250）',
    html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BGINR+A94RUA+2QQG+6GC75" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www24.a8.net/svt/bgt?aid=261111159620&wid=001&eno=01&mid=s00000012796001084000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www17.a8.net/0.gif?a8mat=4BGINR+A94RUA+2QQG+6GC75" alt="">`,
  },
  { place: 'logo', name: '楽天（横長）', html: RAKUTEN_WIDE },

  // ---------- LINEスタンプ ----------
  {
    place: 'line',
    name: 'CLIP STUDIO PAINT（300×250）',
    html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BGINR+ARL7LE+3AP2+67JU9" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www26.a8.net/svt/bgt?aid=261111159651&wid=001&eno=01&mid=s00000015383001043000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=4BGINR+ARL7LE+3AP2+67JU9" alt="">`,
  },
];
