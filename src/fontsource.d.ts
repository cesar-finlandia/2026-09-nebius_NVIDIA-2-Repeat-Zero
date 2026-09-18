declare module "@fontsource-variable/source-serif-4";
declare module "@fontsource-variable/inter";
declare module "@fontsource-variable/jetbrains-mono";
declare module "*?raw" {
  const text: string;
  export default text;
}
// ajv ships no TS types for its draft-2020 subpath under NodeNext; the value
// import is resolved by the bundler (see main.tsx browser seam note).
declare module "ajv/dist/2020";
