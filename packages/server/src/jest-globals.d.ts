declare module '@jest/globals' {
  export const beforeEach: (...args: any[]) => any;
  export const describe: (...args: any[]) => any;
  export const expect: any;
  export const it: (...args: any[]) => any;
  export const jest: any;
}
