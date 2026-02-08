import { render as testingLibraryRender } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

export function render(ui, options = {}) {
  const { wrapper: userWrapper, ...restOptions } = options;

  const combinedWrapper = ({ children }) => {
    if (userWrapper) {
      return (
        <MantineProvider env="test">
          {userWrapper({ children })}
        </MantineProvider>
      );
    }

    return <MantineProvider env="test">{children}</MantineProvider>;
  };

  return testingLibraryRender(ui, { wrapper: combinedWrapper, ...restOptions });
}
