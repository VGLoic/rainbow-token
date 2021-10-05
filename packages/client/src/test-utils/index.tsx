import { render, RenderOptions } from "@testing-library/react";
import AppProviders from "providers";
import * as React from "react";

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AppProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
