const {
  expectRevert,
  testSetup,
  findWinnerPair,
  findRandomPlayer,
  findAnotherColorPlayer,
  addPlayersToGame,
} = require("./utils");

contract("RainbowToken Exceptions", (accounts) => {
  const gameOverSetup =
    (playerAddresses) =>
    async ({ instance, managerInstance }) => {
      const players = await addPlayersToGame({ instance, playerAddresses });
      const winnerPair = findWinnerPair({
        players,
        targetColor: { r: 127, g: 127, b: 127 },
      });

      const [winner, matchingPlayer] = winnerPair;
      await instance.blend(
        matchingPlayer.address,
        matchingPlayer.color.r,
        matchingPlayer.color.g,
        matchingPlayer.color.b,
        {
          from: winner.address,
          value: web3.utils.toWei("0.1"),
          gasPrice: 0,
        }
      );

      await managerInstance.claimVictory(100, 100, 100, {
        from: winner.address,
        gasPrice: 0,
      });

      return winnerPair;
    };
  describe("joining the game", () => {
    it("should revert if not enough value is sent to join the game", async () => {
      const [deployer, player] = accounts;

      const { instance } = await testSetup({ deployer });

      await expectRevert(
        instance.joinGame({
          from: player,
          value: web3.utils.toWei("0.09"),
          gasPrice: 0,
        }),
        "Not enough sent Ethers to join the game"
      );
    });

    it("should revert if sender is already a player", async () => {
      const [deployer, account] = accounts;

      const { instance } = await testSetup({ deployer });

      await instance.joinGame({
        from: account,
        value: web3.utils.toWei("0.1"),
        gasPrice: 0,
      });

      await expectRevert(
        instance.joinGame({
          from: account,
          value: web3.utils.toWei("0.1"),
          gasPrice: 0,
        }),
        "Sender is already a player"
      );
    });

    it("should revert if game is over", async () => {
      const [deployer, ...playerAddresses] = accounts;

      const { instance } = await testSetup({
        deployer,
        customSetup: gameOverSetup(playerAddresses),
      });

      await expectRevert(
        instance.joinGame({
          from: deployer,
          value: web3.utils.toWei("0.1"),
          gasPrice: 0,
        }),
        "The game is over"
      );
    });
  });

  describe("self blend", () => {
    it("should revert if not enough value is sent", async () => {
      const [deployer, ...playerAddresses] = accounts;

      const {
        instance,
        custom: { firstPlayer },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses,
          });
          const firstPlayer = findRandomPlayer({ players });
          return { firstPlayer };
        },
      });

      await expectRevert(
        instance.selfBlend({
          from: firstPlayer.address,
          value: web3.utils.toWei("0.49"),
          gasPrice: 0,
        }),
        "Not enough sent Ethers to self blend"
      );
    });

    it("should revert if sender is not a player", async () => {
      const [deployer, account] = accounts;

      const { instance } = await testSetup({ deployer });

      await expectRevert(
        instance.selfBlend({
          from: account,
          value: web3.utils.toWei("0.5"),
          gasPrice: 0,
        }),
        "Sender is not a player"
      );
    });

    it("should revert if game is over", async () => {
      const [deployer, ...playerAddresses] = accounts;

      const {
        instance,
        custom: [, firstPlayer],
      } = await testSetup({
        deployer,
        customSetup: gameOverSetup(playerAddresses),
      });

      await expectRevert(
        instance.selfBlend({
          from: firstPlayer.address,
          value: web3.utils.toWei("0.5"),
          gasPrice: 0,
        }),
        "The game is over"
      );
    });
  });

  describe("blend", () => {
    it("should revert if not enough value is sent", async () => {
      const [deployer, ...playerAddresses] = accounts;

      const {
        instance,
        custom: { firstPlayer, secondPlayer },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses,
          });
          const firstPlayer = findRandomPlayer({ players });
          const secondPlayer = findRandomPlayer({
            players,
            excludedPlayers: [firstPlayer],
          });
          return {
            firstPlayer,
            secondPlayer,
          };
        },
      });

      await expectRevert(
        instance.blend(
          secondPlayer.address,
          secondPlayer.color.r,
          secondPlayer.color.g,
          secondPlayer.color.b,
          {
            from: firstPlayer.address,
            value: web3.utils.toWei("0.09"),
            gasPrice: 0,
          }
        ),
        "Not enough sent Ethers to blend"
      );
    });

    it("should revert if sender is not a player", async () => {
      const [deployer, account] = accounts;

      const {
        instance,
        custom: { firstPlayer },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses: [account],
          });
          const firstPlayer = findRandomPlayer({ players });
          return {
            firstPlayer,
          };
        },
      });

      await expectRevert(
        instance.blend(
          firstPlayer.address,
          firstPlayer.color.r,
          firstPlayer.color.g,
          firstPlayer.color.b,
          { from: deployer, value: web3.utils.toWei("0.1"), gasPrice: 0 }
        ),
        "Sender is not a player"
      );
    });

    it("should revert if target is not a player", async () => {
      const [deployer, account] = accounts;

      const {
        instance,
        custom: { firstPlayer },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses: [account],
          });
          const firstPlayer = findRandomPlayer({ players });
          return { firstPlayer };
        },
      });

      await expectRevert(
        instance.blend(deployer, 0, 0, 0, {
          from: firstPlayer.address,
          value: web3.utils.toWei("0.1"),
          gasPrice: 0,
        }),
        "Target address is not a player"
      );
    });

    it("should revert if input color is not the one of the player", async () => {
      const [deployer, ...playerAddresses] = accounts;

      const {
        instance,
        custom: { firstPlayer, secondPlayer },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses,
          });
          const firstPlayer = findRandomPlayer({ players });
          const secondPlayer = findAnotherColorPlayer({
            players,
            color: firstPlayer.color,
            excludedPlayers: [firstPlayer],
          });
          return { firstPlayer, secondPlayer };
        },
      });

      await expectRevert(
        instance.blend(
          secondPlayer.address,
          firstPlayer.color.r,
          firstPlayer.color.g,
          firstPlayer.color.b,
          {
            from: firstPlayer.address,
            value: web3.utils.toWei("0.1"),
            gasPrice: 0,
          }
        ),
        "Color of the other player has changed, blend reverted"
      );
    });

    it("should revert if game is over", async () => {
      const [deployer, ...playerAddresses] = accounts;

      const {
        instance,
        custom: [, otherPlayer],
      } = await testSetup({
        deployer,
        customSetup: gameOverSetup(playerAddresses),
      });

      await expectRevert(
        instance.blend(
          otherPlayer.address,
          otherPlayer.color.r,
          otherPlayer.color.g,
          otherPlayer.color.b,
          { from: deployer, value: web3.utils.toWei("0.1"), gasPrice: 0 }
        ),
        "The game is over"
      );
    });
  });

  describe("setBlendingPrice", () => {
    it("should revert if sender is not a player", async () => {
      const [deployer, account] = accounts;

      const { instance } = await testSetup({ deployer });

      await expectRevert(
        instance.setBlendingPrice(web3.utils.toWei("0.5"), {
          from: account,
          gasPrice: 0,
        }),
        "Sender is not a player"
      );
    });

    it("should revert if new blending price is 0", async () => {
      const [deployer, account] = accounts;

      const {
        instance,
        custom: { firstPlayer },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses: [account],
          });
          const firstPlayer = findRandomPlayer({ players });
          return { firstPlayer };
        },
      });

      await expectRevert(
        instance.setBlendingPrice(web3.utils.toWei("0"), {
          from: firstPlayer.address,
          gasPrice: 0,
        }),
        "Blending price must be higher than 0"
      );
    });

    it("should revert if game is over", async () => {
      const [deployer, ...playerAddresses] = accounts;

      const {
        instance,
        custom: [, otherPlayer],
      } = await testSetup({
        deployer,
        customSetup: gameOverSetup(playerAddresses),
      });

      await expectRevert(
        instance.setBlendingPrice(web3.utils.toWei("0.5"), {
          from: otherPlayer.address,
          gasPrice: 0,
        }),
        "The game is over"
      );
    });
  });

  describe("claimVictory", () => {
    it("should revert if the sender is not a player", async () => {
      const [deployer] = accounts;
      const { managerInstance } = await testSetup({ deployer });

      await expectRevert(
        managerInstance.claimVictory(100, 100, 100, {
          from: deployer,
          gasPrice: 0,
        }),
        "Claimed winner address is not a player"
      );
    });

    it("should revert if the new target color is not acceptable", async () => {
      const [deployer, ...playerAddresses] = accounts;
      const {
        managerInstance,
        custom: { winner },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses,
          });

          const winnerPair = findWinnerPair({
            players,
            targetColor: { r: 127, g: 127, b: 127 },
          });

          const [winner, matchingPlayer] = winnerPair;
          await instance.blend(
            matchingPlayer.address,
            matchingPlayer.color.r,
            matchingPlayer.color.g,
            matchingPlayer.color.b,
            {
              from: winner.address,
              value: web3.utils.toWei("0.1"),
              gasPrice: 0,
            }
          );

          return { winner };
        },
      });

      await expectRevert(
        managerInstance.claimVictory(5, 120, 120, {
          from: winner.address,
          gasPrice: 0,
        }),
        "Target color is too close to a base color"
      );
    });

    it("should revert if the game is over", async () => {
      const [deployer, ...playerAddresses] = accounts;
      const {
        managerInstance,
        custom: { firstWinner, secondWinner },
      } = await testSetup({
        deployer,
        customSetup: async ({ instance }) => {
          const players = await addPlayersToGame({
            instance,
            playerAddresses,
          });

          const firstWinnerPair = findWinnerPair({
            players,
            targetColor: { r: 127, g: 127, b: 127 },
          });

          const secondWinnerPair = findWinnerPair({
            players,
            targetColor: { r: 127, g: 127, b: 127 },
            excludedPlayers: [firstWinnerPair[0]],
          });

          const [firstWinner, firstMatchingPlayer] = firstWinnerPair;
          await instance.blend(
            firstMatchingPlayer.address,
            firstMatchingPlayer.color.r,
            firstMatchingPlayer.color.g,
            firstMatchingPlayer.color.b,
            {
              from: firstWinner.address,
              value: web3.utils.toWei("0.1"),
              gasPrice: 0,
            }
          );

          const [secondWinner, secondMatchingPlayer] = secondWinnerPair;
          await instance.blend(
            secondMatchingPlayer.address,
            secondMatchingPlayer.color.r,
            secondMatchingPlayer.color.g,
            secondMatchingPlayer.color.b,
            {
              from: secondWinner.address,
              value: web3.utils.toWei("0.1"),
              gasPrice: 0,
            }
          );

          return {
            firstWinner,
            secondWinner,
          };
        },
      });

      await managerInstance.claimVictory(100, 100, 100, {
        from: firstWinner.address,
        gasPrice: 0,
      }),
        await expectRevert(
          managerInstance.claimVictory(100, 100, 100, {
            from: secondWinner.address,
            gasPrice: 0,
          }),
          "Claimed winner address is not a player"
        );
    });
  });
});
