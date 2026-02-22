declare module "../../test-utils/index.js" {
  export * from "@testing-library/react";
  import type { RenderOptions, RenderResult } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  import type React from "react";

  export function render(
    ui: React.ReactElement,
    options?: RenderOptions,
  ): RenderResult;
  export { userEvent };
}

declare module "../../test-utils/index" {
  export * from "../../test-utils/index.js";
}
