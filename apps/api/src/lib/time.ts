export function ymdToDate(ymd: string) {
    const [y,m,d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m-1, d, 12, 0, 0));
  }
  export function jsDowToIsoDow(js: number) {
    return js === 0 ? 7 : js; // JS 0..6 -> 7..6 with Mon=1
  }
  