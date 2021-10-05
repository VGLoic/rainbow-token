import { render, waitFor, screen, waitForElementToBeRemoved } from "test-utils";
import App from "App";
import userEvent from "@testing-library/user-event";
import { setupEthTesting } from "eth-testing";

describe("Connection to application", () => {
  describe("when MetaMask is unavailable", () => {
    test("it should disabled the connect with MetaMask button", async () => {
      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Connect with your favorite wallet/i)
        ).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /metamask/i })).toBeDisabled();
    });
  });

  describe("when MetaMask is available", () => {
    const address = "0xf61B443A155b07D2b2cAeA2d99715dC84E839EEf";
    const { provider, testingUtils } = setupEthTesting({
      providerType: "MetaMask",
    });

    beforeAll(() => {
      (global.window as any).ethereum = provider;
    });

    afterAll(() => {
      (global.window as any).ethereum = undefined;
    });

    afterEach(() => {
      testingUtils.clearAllMocks();
    });

    test("it should allow the user to connect successfully", async () => {
      testingUtils.mockChainId("0x1");
      testingUtils.mockAccounts([]);

      testingUtils.lowLevel.mockRequest("eth_requestAccounts", [address]);

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Connect with your favorite wallet/i)
        ).toBeInTheDocument();
      });

      const connectWithMetaMaskButton = screen.getByRole("button", {
        name: /metamask/i,
      });

      userEvent.click(connectWithMetaMaskButton);
      expect(connectWithMetaMaskButton).toBeDisabled();

      await waitForElementToBeRemoved(connectWithMetaMaskButton);

      expect(screen.getByText(/account/i)).toBeInTheDocument();
    });

    test("it should go directly to the connected app when MetaMask is already connected", async () => {
      testingUtils.mockAccounts([address]);
      testingUtils.mockChainId("0x1");

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/account/i)).toBeInTheDocument();
      });
    });
  });
});
