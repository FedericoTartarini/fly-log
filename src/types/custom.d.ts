// Allow importing .js and .jsx files without TS errors in this codebase
import type { ComponentType } from "react";

declare module "*.js" {
  const value: unknown;
  export default value;
}

declare module "*.jsx" {
  const value: ComponentType<unknown>;
  export default value;
}
