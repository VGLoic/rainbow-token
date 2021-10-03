const RainbowToken = artifacts.require("RainbowToken");
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

contract("RainbowToken Game Path", (accounts) => {
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

    /**
     * Players have joined the game
     * Balances should have decreased by 0.1 ether for each player
     * Balance of the contract should have increased by 0.1 * number of players
     * Player addresses should be in the player list
     */

    const updatedPlayerBalances = await getBalances(playerAddresses);
    playerAddresses.forEach((_, i) => {
      expectDecrease(
        originalBalances[i],
        0.1,
        updatedPlayerBalances[i],
        `Balance of the player with index ${i} is not correct after test setup`
      );
    });

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

    /**
     * Second player increases its blending price
     */
    await instance.setBlendingPrice(web3.utils.toWei("1"), {
      from: secondPlayer.address,
      gasPrice: 0,
    });

    /**
     * First player blends with second player
     * Color of the first player should be updated
     * Color of the second player should not be updated
     * Balance of the first player should have decreased by 1 ether
     * Balance of the second player should have increased by 0.5 ether
     * Balance of the contract should have increased by 0.5 ether
     */

    await instance.blend(
      secondPlayer.address,
      secondPlayer.color.r,
      secondPlayer.color.g,
      secondPlayer.color.b,
      { from: firstPlayer.address, gasPrice: 0, value: web3.utils.toWei("1") }
    );

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

    /**
     * First player self blends
     * Color of the first player should be updated
     * Balance of the first player should have decreased by 0.5 ether
     * Balance of the contract should have increased by 0.5 ether
     */

    await instance.selfBlend({
      from: firstPlayer.address,
      gasPrice: 0,
      value: web3.utils.toWei("0.5"),
    });

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

    /**
     * Winner claims victory
     * Contract balance should be 0
     * Balance of the winner should have increased by the amount of ether in the contract
     * Game should be over
     * New RainbowToken should be created with no player and new target color
     */

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
    await managerInstance.claimVictory(100, 100, 100, {
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

    const newContractAddress = await managerInstance.getGameAddress();
    const newInstance = await RainbowToken.at(newContractAddress);

    const targetColor = await newInstance.getTargetColor();
    expect(targetColor.r).to.equal("100");
    expect(targetColor.g).to.equal("100");
    expect(targetColor.b).to.equal("100");

    const newPlayerList = await newInstance.getPlayerList();
    expect(newPlayerList.length).to.equal(0);
  });
});
