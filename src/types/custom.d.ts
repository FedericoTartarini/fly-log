// Allow importing .js and .jsx files without TS errors in this codebase
declare module "*.js" {
  const value: any;
  export default value;
}
declare module "*.jsx" {
  const value: any;
  export default value;
}

// Allow bare imports from modules that don't have types
declare module "../context/AuthContext.jsx" {
  const value: any;
  export default value;
}
declare module "./FlightCsvUpload.jsx" {
  const value: any;
  export default value;
}

