import { Paper } from "@mui/material";
import Account from "./account";

function Sidebar() {
  return (
    <Paper
      elevation={1}
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "80%",
        margin: "auto",
        padding: "24px",
        flex: 1,
      }}
    >
      <Account />
    </Paper>
  );
}

export default Sidebar;
