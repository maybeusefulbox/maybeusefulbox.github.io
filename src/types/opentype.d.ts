// opentype.js には TypeScript の型情報が付いていないので、このサイトで使う部分だけ型を書いておく。
// （型があると、エディタで補完が効き、書き間違いをビルド前に見つけられる）
declare module 'opentype.js' {
  export interface PathCommand {
    type: 'M' | 'L' | 'C' | 'Q' | 'Z';
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  export interface Path {
    commands: PathCommand[];
    getBoundingBox(): BoundingBox;
  }
  export interface Glyph {
    index: number;
    advanceWidth?: number;
    /** x, y はベースラインの位置。返るパスは SVG と同じ「下向きが +y」の座標 */
    getPath(x: number, y: number, fontSize: number): Path;
  }
  export interface Font {
    unitsPerEm: number;
    charToGlyph(char: string): Glyph;
    charToGlyphIndex(char: string): number;
    getKerningValue(left: Glyph, right: Glyph): number;
  }
  export function parse(buffer: ArrayBuffer): Font;
}
