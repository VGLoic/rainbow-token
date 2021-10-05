import { Box } from "@mui/system";
import rainbowImage from "assets/rainbow-unsplash.jpeg";

type LayoutProps = {
  children: React.ReactNode;
};
function Layout({ children }: LayoutProps) {
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
        overflow: "hidden",
        backgroundImage: `url(${rainbowImage})`,
        backgroundSize: "cover",
      }}
    >
      {children}
    </Box>
  );
}

export default Layout;
