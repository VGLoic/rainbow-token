import * as React from "react";
import { useMetaMask } from "metamask-react";
import ConnectionPanel from "connection-panel";
import ConnectedApp from "connected-app";

function App() {
  const { status } = useMetaMask();

  if (status === "initializing") return null;

  if (status === "connected") return <ConnectedApp />;

  return <ConnectionPanel />;
}

export default React.memo(App);
