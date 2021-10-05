import { Box, Icon, Paper, Typography } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useMetaMask } from "metamask-react";
import metamaskSvg from "assets/metamask-fox.svg";

function MetaMaskIcon() {
  return (
    <Icon>
      <Box
        component="img"
        sx={{ height: "100%" }}
        src={metamaskSvg}
        alt="metamask"
      />
    </Icon>
  );
}

function ConnectionPanel() {
  const { connect, status } = useMetaMask();

  return (
    <Paper
      elevation={2}
      sx={{
        margin: "auto",
        padding: "32px",
        minWidth: "400px",
        minHeight: "175px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="overline" fontSize={15}>
        Connect with your favorite wallet
      </Typography>
      <Box display="flex">
        <LoadingButton
          disabled={status === "unavailable"}
          variant="outlined"
          onClick={connect}
          startIcon={<MetaMaskIcon />}
          loadingPosition="start"
          loading={status === "connecting"}
        >
          MetaMask
        </LoadingButton>
      </Box>
    </Paper>
  );
}

export default ConnectionPanel;
