import { CssBaseline } from "@mui/material";
import { MetaMaskProvider } from "metamask-react";
import { ThemeProvider } from "providers";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Layout from "./layout";
import reportWebVitals from "./reportWebVitals";

ReactDOM.render(
  <React.StrictMode>
    <CssBaseline />
    <ThemeProvider>
      <MetaMaskProvider>
        <Layout>
          <App />
        </Layout>
      </MetaMaskProvider>
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
