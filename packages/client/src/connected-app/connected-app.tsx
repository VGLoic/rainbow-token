import { Box } from "@mui/material";
import Sidebar from "./sidebar";

function ConnectedApp() {
  return (
    <Box
      sx={{
        padding: "24px",
        display: "flex",
        flex: 1,
      }}
    >
      <Sidebar />
      <Box
        sx={{
          flex: 5,
          marginLeft: "48px",
        }}
      >
        Coucou
      </Box>
    </Box>
  );
}

export default ConnectedApp;
