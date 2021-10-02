const {
  getBalances,
  expectDecrease,
  expectIncrease,
  expectRevert,
  testSetup,
  findWinnerPair,
  findRandomPlayer,
  findAnotherColorPlayer,
  addPlayersToGame,
} = require("./utils");

contract("RainbowToken", (accounts) => {
  it("should allow various addresses to join the game and blend together", async () => {
    const [deployer, ...playerAddresses] = accounts;

    async function customSetup({ instance }) {
      const originalBalances = await getBalances(playerAddresses);

      const players = await addPlayersToGame({ instance, playerAddresses });

      const winnerPair = findWinnerPair({
        players,
        targetColor: { r: 127, g: 127, b: 127 },
      });

      const firstPlayer = findRandomPlayer({
        players,
        excludedPlayers: winnerPair,
      });

      const secondPlayer = findAnotherColorPlayer({
        players,
        color: firstPlayer.color,
        excludedPlayers: [...winnerPair, firstPlayer],
      });

      return {
        originalBalances,
        winnerPair,
        firstPlayer,
        secondPlayer,
      };
    }

    const {
      managerInstance,
      instance,
      custom: { originalBalances, winnerPair, firstPlayer, secondPlayer },
    } = await testSetup({
      deployer,
      customSetup,
    });

    // Balances should have decreased by 0.1 ether for each of the player

    const updatedPlayerBalances = await getBalances(playerAddresses);
    playerAddresses.forEach((_, i) => {
      expectDecrease(
        originalBalances[i],
        0.1,
        updatedPlayerBalances[i],
        `Balance of the player with index ${i} is not correct after test setup`
      );
    });

    // Contract balance should have increased
    let [contractBalance] = await getBalances([instance.address]);
    expectIncrease(
      0,
      0.1 * playerAddresses.length,
      contractBalance,
      "Balance of the contract is not correct after test setup"
    );

    const playerList = await instance.getPlayerList();
    playerList.forEach((p, i) => {
      expect(p).to.equal(
        playerAddresses[i],
        `Index: ${i}: player address ${p} does not match ${playerAddresses[i]}`
      );
    });

    // Other player increases its blending price
    await instance.setBlendingPrice(web3.utils.toWei("1"), {
      from: secondPlayer.address,
      gasPrice: 0,
    });

    // First player blends with another player

    await instance.blend(
      secondPlayer.address,
      secondPlayer.color.r,
      secondPlayer.color.g,
      secondPlayer.color.b,
      { from: firstPlayer.address, gasPrice: 0, value: web3.utils.toWei("1") }
    );

    // Color should be updated for the first player only

    const [updatedFirstPlayer, updatedSecondPlayer] = await instance.getPlayers(
      [firstPlayer.address, secondPlayer.address]
    );
    expect(Number(updatedFirstPlayer.color.r)).to.equal(
      Math.floor(
        (Number(firstPlayer.color.r) + Number(secondPlayer.color.r)) / 2
      ),
      "Player R component has been wrongly updated after blend with other player"
    );
    expect(Number(updatedFirstPlayer.color.g)).to.equal(
      Math.floor(
        (Number(firstPlayer.color.g) + Number(secondPlayer.color.g)) / 2
      ),
      "Player G component has been wrongly updated after blend with other player"
    );
    expect(Number(updatedFirstPlayer.color.b)).to.equal(
      Math.floor(
        (Number(firstPlayer.color.b) + Number(secondPlayer.color.b)) / 2
      ),
      "Player B component has been wrongly updated after blend with other player"
    );
    expect(updatedSecondPlayer.color.r).to.equal(
      secondPlayer.color.r,
      "Other player R component has been updated after blend with first player"
    );
    expect(updatedSecondPlayer.color.g).to.equal(
      secondPlayer.color.g,
      "Other player G component has been updated after blend with first player"
    );
    expect(updatedSecondPlayer.color.b).to.equal(
      secondPlayer.color.b,
      "Other player B component has been updated after blend with first player"
    );

    // Balances should be updated

    const [updatedFirstPlayerBalance, updatedSecondPlayerBalance] =
      await getBalances([firstPlayer.address, secondPlayer.address]);
    expectDecrease(
      updatedPlayerBalances[firstPlayer.index],
      1,
      updatedFirstPlayerBalance,
      "Balance of the first player is not correct after blend with other player"
    );
    expectIncrease(
      updatedPlayerBalances[secondPlayer.index],
      0.5,
      updatedSecondPlayerBalance,
      "Balance of the other player is not correct after blend with first player"
    );

    let previousContractBalance = contractBalance;
    [contractBalance] = await getBalances([instance.address]);
    expectIncrease(
      previousContractBalance,
      0.5,
      contractBalance,
      "Balance of the contract is not correct after blend between the two players"
    );

    // First player does a self blend

    await instance.selfBlend({
      from: firstPlayer.address,
      gasPrice: 0,
      value: web3.utils.toWei("0.5"),
    });

    // Color should be updated

    const firstPlayerFinalState = await instance.getPlayer(firstPlayer.address);
    expect(Number(firstPlayerFinalState.color.r)).to.equal(
      Math.floor(
        (Number(updatedFirstPlayer.color.r) +
          Number(firstPlayer.defaultColor.r)) /
          2
      ),
      "Player R component has been wrongly updated after self blend"
    );
    expect(Number(firstPlayerFinalState.color.g)).to.equal(
      Math.floor(
        (Number(updatedFirstPlayer.color.g) +
          Number(firstPlayer.defaultColor.g)) /
          2
      ),
      "Player G component has been wrongly updated after self blend"
    );
    expect(Number(firstPlayerFinalState.color.b)).to.equal(
      Math.floor(
        (Number(updatedFirstPlayer.color.b) +
          Number(firstPlayer.defaultColor.b)) /
          2
      ),
      "Player B component has been wrongly updated after self blend"
    );

    // Balances should be updated

    const [finalFirstPlayerBalance] = await getBalances([firstPlayer.address]);
    expectDecrease(
      updatedFirstPlayerBalance,
      0.5,
      finalFirstPlayerBalance,
      "Balance of the first player is not correct after self blend"
    );

    previousContractBalance = contractBalance;
    [contractBalance] = await getBalances([instance.address]);
    expectIncrease(
      previousContractBalance,
      0.5,
      contractBalance,
      "Balance of the contract is not correct after self blend"
    );

    // Winner claims victory

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
    previousContractBalance = contractBalance;
    [contractBalance] = await getBalances([instance.address]);

    const [beforeWinWinnerBalance] = await getBalances([winner.address]);
    await managerInstance.claimVictory(0, 0, 0, {
      from: winner.address,
      gasPrice: 0,
    });

    previousContractBalance = contractBalance;
    [contractBalance] = await getBalances([instance.address]);
    expect(contractBalance).to.equal(0);

    const [winnerBalance] = await getBalances([winner.address]);
    expectIncrease(
      beforeWinWinnerBalance,
      previousContractBalance,
      winnerBalance,
      "Balance of the winner is not correct after claiming victory."
    );

    const gameOver = await instance.gameOver();

    expect(gameOver).to.equal(true);
  });

  describe("Exceptions", () => {
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

        await managerInstance.claimVictory(127, 127, 127, {
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
          managerInstance.claimVictory(127, 127, 127, {
            from: deployer,
            gasPrice: 0,
          }),
          "Claimed winner address is not a player"
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

        await managerInstance.claimVictory(0, 0, 0, {
          from: firstWinner.address,
          gasPrice: 0,
        }),
          await expectRevert(
            managerInstance.claimVictory(0, 0, 0, {
              from: secondWinner.address,
              gasPrice: 0,
            }),
            "Claimed winner address is not a player"
          );
      });
    });
  });
});
