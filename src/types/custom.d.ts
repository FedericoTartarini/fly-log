// Allow importing .js and .jsx files without TS errors in this codebase
declare module "*.js" {
  const value: unknown;
  export default value;
}
declare module "*.jsx" {
  const value: unknown;
  export default value;
}
