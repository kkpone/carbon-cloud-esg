declare module 'opencc-js' {
  export type OpenCCLocale = 'cn' | 'hk' | 'tw' | 'twp' | 'jp' | 't';
  export function Converter(options: {
    from: OpenCCLocale;
    to: OpenCCLocale;
  }): (text: string) => string;
}
