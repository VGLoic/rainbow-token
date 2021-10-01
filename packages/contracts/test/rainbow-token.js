const {
  getBalances,
  expectDecrease,
  expectIncrease,
  expectRevert,
  setup
} = require("./utils");

contract("RainbowToken", (accounts) => {

  it("should allow various addresses to join the game and blend together", async () => {

    const [deployer, ...playerAddresses] = accounts;

    const {
      managerInstance,
      instance,
      originalBalances,
      winner,
      firstPlayer,
      otherPlayer
    } = await setup(deployer, playerAddresses);


    // Balances should have decreased by 0.1 ether for each of the player

    const updatedPlayerBalances = await getBalances(playerAddresses);
    playerAddresses.forEach((_ ,i) => {
      expectDecrease(originalBalances[i], 0.1, updatedPlayerBalances[i], `Balance of the player with index ${i} is not correct after test setup`);
    });

    // Contract balance should have increased
    let [contractBalance] = await getBalances([instance.address]);
    expectIncrease(0, 0.1 * playerAddresses.length, contractBalance, "Balance of the contract is not correct after test setup");

    const playerList = await instance.getPlayerList();
    playerList.forEach((p, i) => {
      expect(p).to.equal(playerAddresses[i], `Index: ${i}: player address ${p} does not match ${playerAddresses[i]}`);
    });


    // Other player increases its blending price
    await instance.setBlendingPrice(web3.utils.toWei("1"), { from: otherPlayer.address, gasPrice: 0 });

    // First player blends with another player

    await instance.blend(
      otherPlayer.address,
      otherPlayer.color.r,
      otherPlayer.color.g,
      otherPlayer.color.b,
      { from: firstPlayer.address, gasPrice: 0, value: web3.utils.toWei("1") }
    );

    // Color should be updated for the first player only

    const [updatedFirstPlayer, updatedOtherPlayer] = await instance.getPlayers([ firstPlayer.address, otherPlayer.address ]);
    expect(Number(updatedFirstPlayer.color.r)).to.equal(Math.floor((Number(firstPlayer.color.r) + Number(otherPlayer.color.r)) / 2), "Player R component has been wrongly updated after blend with other player");
    expect(Number(updatedFirstPlayer.color.g)).to.equal(Math.floor((Number(firstPlayer.color.g) + Number(otherPlayer.color.g)) / 2), "Player G component has been wrongly updated after blend with other player");
    expect(Number(updatedFirstPlayer.color.b)).to.equal(Math.floor((Number(firstPlayer.color.b) + Number(otherPlayer.color.b)) / 2), "Player B component has been wrongly updated after blend with other player");
    expect(updatedOtherPlayer.color.r).to.equal(otherPlayer.color.r, "Other player R component has been updated after blend with first player");
    expect(updatedOtherPlayer.color.g).to.equal(otherPlayer.color.g, "Other player G component has been updated after blend with first player");
    expect(updatedOtherPlayer.color.b).to.equal(otherPlayer.color.b, "Other player B component has been updated after blend with first player");
    
    // Balances should be updated

    const [updatedFirstPlayerBalance, updatedOtherPlayerBalance] = await getBalances(([ firstPlayer.address, otherPlayer.address ]));
    expectDecrease(updatedPlayerBalances[firstPlayer.index], 1, updatedFirstPlayerBalance, "Balance of the first player is not correct after blend with other player");
    expectIncrease(updatedPlayerBalances[otherPlayer.index], 0.5, updatedOtherPlayerBalance, "Balance of the other player is not correct after blend with first player");

    let previousContractBalance = contractBalance;
    [contractBalance] = await getBalances([instance.address]);
    expectIncrease(previousContractBalance, 0.5, contractBalance, "Balance of the contract is not correct after blend between the two players");

    // First player does a self blend

    await instance.selfBlend({ from: firstPlayer.address, gasPrice: 0, value: web3.utils.toWei("0.5") });

    // Color should be updated

    const firstPlayerFinalState  = await instance.getPlayer(firstPlayer.address);
    expect(Number(firstPlayerFinalState.color.r)).to.equal(Math.floor((Number(updatedFirstPlayer.color.r) + Number(firstPlayer.defaultColor.r)) / 2), "Player R component has been wrongly updated after self blend");
    expect(Number(firstPlayerFinalState.color.g)).to.equal(Math.floor((Number(updatedFirstPlayer.color.g) + Number(firstPlayer.defaultColor.g)) / 2), "Player G component has been wrongly updated after self blend");
    expect(Number(firstPlayerFinalState.color.b)).to.equal(Math.floor((Number(updatedFirstPlayer.color.b) + Number(firstPlayer.defaultColor.b)) / 2), "Player B component has been wrongly updated after self blend");

    // Balances should be updated

    const [finalFirstPlayerBalance] = await getBalances(([ firstPlayer.address ]));
    expectDecrease(updatedFirstPlayerBalance, 0.5, finalFirstPlayerBalance, "Balance of the first player is not correct after self blend");
    
    previousContractBalance = contractBalance;
    [contractBalance] = await getBalances([instance.address]);
    expectIncrease(previousContractBalance, 0.5, contractBalance, "Balance of the contract is not correct after self blend");

    // Winner claims victory

    await managerInstance.claimVictory(0, 0, 0, { from: winner.address, gasPrice: 0 });

    previousContractBalance = contractBalance;
    [contractBalance] = await getBalances([instance.address]);
    expect(contractBalance).to.equal(0);

    const [winnerBalance] = await getBalances([winner.address]);
    expectIncrease(
      updatedPlayerBalances[winner.index],
      previousContractBalance,
      winnerBalance,
      "Balance of the winner is not correct after claiming victory."
    );

    const gameOver = await instance.gameOver();

    expect(gameOver).to.equal(true);

  });

  describe("Exceptions", () => {
    describe("joining the game", () => {
      it("should revert if not enough value is sent to join the game", async () => {
        const [deployer, player] = accounts;
    
        const { instance } = await setup(deployer);
    
        await expectRevert(
          instance.joinGame({ from: player, value: web3.utils.toWei("0.09"), gasPrice: 0 }),
          "Not enough sent Ethers to join the game"
        );
      })
    
      it("should revert if sender is already a player", async () => {
        const [deployer, account] = accounts;
    
        const { instance } = await setup(deployer);
    
        await instance.joinGame({ from: account, value: web3.utils.toWei("0.1"), gasPrice: 0 });
    
        await expectRevert(
          instance.joinGame({ from: account, value: web3.utils.toWei("0.1"), gasPrice: 0 }),
          "Sender is already a player"
        );
      });

      it("should revert if game is over", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { managerInstance, instance, winner } = await setup(deployer, playerAddresses);
    
        await managerInstance.claimVictory(0, 0, 0, { from: winner.address, gasPrice: 0 });
    
        await expectRevert(
          instance.joinGame({ from: deployer, value: web3.utils.toWei("0.1"), gasPrice: 0 }),
          "The game is over"
        );
      });
    });

    describe("self blend", () => {
      it("should revert if not enough value is sent", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { instance, firstPlayer } = await setup(deployer, playerAddresses);
    
        await expectRevert(
          instance.selfBlend({ from: firstPlayer.address, value: web3.utils.toWei("0.49"), gasPrice: 0 }),
          "Not enough sent Ethers to self blend"
        );
      })

      it("should revert if sender is not a player", async () => {
        const [deployer, account] = accounts;
    
        const { instance } = await setup(deployer);
    
        await expectRevert(
          instance.selfBlend({ from: account, value: web3.utils.toWei("0.5"), gasPrice: 0 }),
          "Sender is not a player"
        );
      })

      it("should revert if game is over", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { managerInstance, instance, winner, firstPlayer } = await setup(deployer, playerAddresses);
    
        await managerInstance.claimVictory(0, 0, 0, { from: winner.address, gasPrice: 0 });
    
        await expectRevert(
          instance.selfBlend({ from: firstPlayer.address, value: web3.utils.toWei("0.5"), gasPrice: 0 }),
          "The game is over"
        );
      });
    });

    describe("blend", () => {
      it("should revert if not enough value is sent", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { instance, firstPlayer, otherPlayer } = await setup(deployer, playerAddresses);
    
        await expectRevert(
          instance.blend(
            otherPlayer.address,
            otherPlayer.color.r,
            otherPlayer.color.g,
            otherPlayer.color.b,
            { from: firstPlayer.address, value: web3.utils.toWei("0.09"), gasPrice: 0 }
          ),
          "Not enough sent Ethers to blend"
        );
      })

      it("should revert if sender is not a player", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { instance, otherPlayer } = await setup(deployer, playerAddresses);
    
        await expectRevert(
          instance.blend(
            otherPlayer.address,
            otherPlayer.color.r,
            otherPlayer.color.g,
            otherPlayer.color.b,
            { from: deployer, value: web3.utils.toWei("0.1"), gasPrice: 0 }
          ),
          "Sender is not a player"
        );
      })

      it("should revert if target is not a player", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { instance, firstPlayer } = await setup(deployer, playerAddresses);
    
        await expectRevert(
          instance.blend(
            deployer,
            0,
            0,
            0,
            { from: firstPlayer.address, value: web3.utils.toWei("0.1"), gasPrice: 0 }
          ),
          "Target address is not a player"
        );
      })

      it("should revert if input color is not the one of the player", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { instance, firstPlayer, otherPlayer } = await setup(deployer, playerAddresses);
    
        await expectRevert(
          instance.blend(
            otherPlayer.address,
            firstPlayer.color.r,
            firstPlayer.color.g,
            firstPlayer.color.b,
            { from: firstPlayer.address, value: web3.utils.toWei("0.1"), gasPrice: 0 }
          ),
          "Color of the other player has changed, blend reverted"
        );
      })

      it("should revert if game is over", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { managerInstance, instance, winner, otherPlayer } = await setup(deployer, playerAddresses);
    
        await managerInstance.claimVictory(0, 0, 0, { from: winner.address, gasPrice: 0 });
    
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
    
        const { instance } = await setup(deployer);
    
        await expectRevert(
          instance.setBlendingPrice(web3.utils.toWei("0.5"), { from: account, gasPrice: 0 }),
          "Sender is not a player"
        );
      })

      it("should revert if new blending price is 0", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { instance, firstPlayer } = await setup(deployer, playerAddresses);
    
        await expectRevert(
          instance.setBlendingPrice(web3.utils.toWei("0"), { from: firstPlayer.address, gasPrice: 0 }),
          "Blending price must be higher than 0"
        );
      })

      it("should revert if game is over", async () => {
        const [deployer, ...playerAddresses] = accounts;
    
        const { managerInstance, instance, winner, firstPlayer } = await setup(deployer, playerAddresses);
    
        await managerInstance.claimVictory(0, 0, 0, { from: winner.address, gasPrice: 0 });
    
        await expectRevert(
          instance.setBlendingPrice(web3.utils.toWei("0.5"), { from: firstPlayer.address, gasPrice: 0 }),
          "The game is over"
        );
      });
    });
    
    describe("claimVictory", () => {
      it("should revert if the argument address is not a player", async () => {
        const [deployer, ...playerAddresses] = accounts;
        const { managerInstance } = await setup(deployer, playerAddresses);

        await expectRevert(
          managerInstance.claimVictory(0, 0, 0, { from: deployer, gasPrice: 0 }),
          "Claimed winner address is not a player"
        );
      });

      // it("should revert if the game is over", async () => {
      //   const [deployer, ...playerAddresses] = accounts;
      //   const { managerInstance, winner } = await setup(deployer, playerAddresses);

      //   await managerInstance.claimVictory(0, 0, 0, { from: winner.address, gasPrice:0 }),

      //   await expectRevert(
      //     managerInstance.claimVictory(0, 0, 0, { from: winner.address, gasPrice:0 }),
      //     "The game is over"
      //   );
      // });
    });
  });
});
