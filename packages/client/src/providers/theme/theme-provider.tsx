import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material";

const theme = createTheme({
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#eee",
        },
      },
    },
  },
});

type ThemeProviderProps = any;
function ThemeProvider(props: ThemeProviderProps) {
  return <MuiThemeProvider theme={theme} {...props} />;
}

export default ThemeProvider;
