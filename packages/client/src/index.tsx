import { CssBaseline } from "@mui/material";
import AppProviders from "providers";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Layout from "./layout";
import reportWebVitals from "./reportWebVitals";

ReactDOM.render(
  <React.StrictMode>
    <CssBaseline />
    <AppProviders>
      <Layout>
        <App />
      </Layout>
    </AppProviders>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
