declare module "../../test-utils/index.js" {
  export * from "@testing-library/react";
  export const render: typeof import("@testing-library/react").render;
  export const userEvent: typeof import("@testing-library/user-event").default;
}
