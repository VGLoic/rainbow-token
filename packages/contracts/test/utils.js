const RainbowToken = artifacts.require("RainbowToken");
const RainbowManager = artifacts.require("RainbowManager");

async function getBalances(addresses) {
    const rawBalances = await Promise.all(addresses.map(a => web3.eth.getBalance(a)))
    return rawBalances.map(b => Number(web3.utils.fromWei(b, "ether")));
  }
  
  function expectDecrease(originalAmount, decrease, newAmount, errorMessage) {
    expect(Number.parseFloat(newAmount).toFixed(4)).to.equal(Number.parseFloat(originalAmount - decrease).toFixed(4), errorMessage);
  }
  function expectIncrease(originalAmount, increase, newAmount, errorMessage) {
    expect(Number.parseFloat(newAmount).toFixed(4)).to.equal(Number.parseFloat(originalAmount + increase).toFixed(4), errorMessage);
  }

  async function expectRevert(promise, reason) {
    let err;
    try {
      await promise;
    } catch (e) {
      err = e;
    }
    expect(Boolean(err)).to.equal(true, "No error detected while it was expected.");
    expect(Boolean(err.data)).to.equal(true, `No "data" field on the error while it was expected for a revert. Got error ${err}`);
    if (reason) {
      expect(err.reason).to.equal(reason);
    }
  }
  
  async function setup(deployer, playerAddresses = []) {
    let iteration = 0;
    while (iteration < 50) {
  
      iteration++;
  
      const managerInstance = await RainbowManager.new(0, 0, 0, { from: deployer, gasPrice: 0 });
  
      const rainbowAddress = await managerInstance.getGameAddress();
      const instance = await RainbowToken.at(rainbowAddress);
    
      const originalBalances = await getBalances(playerAddresses);

      if (playerAddresses.length === 0) {
          return {
            managerInstance,
            instance,
          }
      }

      await Promise.all(
        playerAddresses.map(playerAddress => instance.joinGame({
          from: playerAddress,
          value: web3.utils.toWei("0.1"),
          gas: 200000,
          gasPrice: 0
        }))
      );
      
      const players = await instance.getPlayers(playerAddresses);
    
      const winnerIndex = players.findIndex(p => p.color.r === '0' && p.color.g === '0' && p.color.b === '0');
      if (winnerIndex < 0) {
        console.log("No winner found, trying again");
        continue;
      }
    
      const firstPlayerIndex = players.findIndex((_, i) => i !== winnerIndex);
      const firstPlayer = players[firstPlayerIndex];
    
      const otherPlayerIndex = players.findIndex((p, i) => {
        const { r, g, b } = p.color;
        return i !== winnerIndex && (r !== firstPlayer.color.r || g !== firstPlayer.color.g || b !== firstPlayer.color.b)
       }); 
       if (otherPlayerIndex < 0) {
        console.log("No other player found, trying again");
        continue;
      }
  
    
      return {
        managerInstance,
        instance,
        originalBalances,
        winner: {
          index: winnerIndex,
          address: playerAddresses[winnerIndex],
          ...players[winnerIndex],
        },
        firstPlayer: {
          index: firstPlayerIndex,
          address: playerAddresses[firstPlayerIndex],
          ...firstPlayer,
        },
        otherPlayer: {
          index: otherPlayerIndex,
          address: playerAddresses[otherPlayerIndex],
          ...players[otherPlayerIndex]
        }
      };
    }
  
  }

  module.exports = {
    getBalances,
    expectDecrease,
    expectIncrease,
    expectRevert,
    setup
  }