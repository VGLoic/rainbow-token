import { MetaMaskProvider } from "metamask-react";
import * as React from "react";
import { ThemeProvider } from "./theme";

type AppProvidersProps = {
  children: React.ReactNode;
};
function AppProviders<T extends AppProvidersProps>(props: T) {
  return (
    <ThemeProvider>
      <MetaMaskProvider>{props.children}</MetaMaskProvider>
    </ThemeProvider>
  );
}

export * from "./theme";
export default AppProviders as React.FunctionComponent<{}>;
