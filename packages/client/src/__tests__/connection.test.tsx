import { render, waitFor, screen, waitForElementToBeRemoved } from "test-utils";
import App from "App";
import userEvent from "@testing-library/user-event";
import { setupEthTesting } from "eth-testing";

describe("Connection to application", () => {
  describe("when MetaMask is available", () => {
    const { provider, testingUtils } = setupEthTesting({
      providerType: "MetaMask",
    });

    beforeAll(() => {
      (global.window as any).ethereum = provider;
    });

    afterAll(() => {
      (global.window as any).ethereum = undefined;
    });

    test("it should allow the user to connect successfully", async () => {
      const address = "0xf61B443A155b07D2b2cAeA2d99715dC84E839EEf";

      testingUtils.mockChainId("0x1");
      testingUtils.mockAccounts([]);

      testingUtils.lowLevel.mockRequest("eth_requestAccounts", [address]);

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Connect with your favorite wallet/i)
        ).toBeInTheDocument();
      });

      userEvent.click(screen.getByRole("button", { name: /metamask/i }));

      await waitForElementToBeRemoved(
        screen.getByRole("button", { name: /metamask/i })
      );

      expect(screen.getByText(/account/i)).toBeInTheDocument();
    });
  });
});
