const RainbowToken = artifacts.require("RainbowToken");
const RainbowManager = artifacts.require("RainbowManager");

async function testSetup({
  deployer,
  targetColor = { r: 127, g: 127, b: 127 },
  customSetup,
  maxIteration = 50,
}) {
  let iteration = 0;
  while (iteration < maxIteration) {
    iteration++;

    const managerInstance = await RainbowManager.new(
      targetColor.r,
      targetColor.g,
      targetColor.b,
      {
        from: deployer,
        gasPrice: 0,
      }
    );
    const rainbowAddress = await managerInstance.getGameAddress();
    const instance = await RainbowToken.at(rainbowAddress);

    if (!customSetup) {
      return {
        managerInstance,
        instance,
      };
    }

    try {
      const customSetupResult = await customSetup({
        managerInstance,
        instance,
      });
      return {
        managerInstance,
        instance,
        custom: customSetupResult,
      };
    } catch (err) {
      console.log("Custom setup has failed, trying again: ", err);
      continue;
    }
  }
}

function findMatchingPlayer(player, otherPlayers, targetColor) {
  const matchingPlayer = otherPlayers.find((p) => {
    const resultingColor = {
      r: Math.floor((Number(p.color.r) + Number(player.color.r)) / 2),
      g: Math.floor((Number(p.color.g) + Number(player.color.g)) / 2),
      b: Math.floor((Number(p.color.b) + Number(player.color.b)) / 2),
    };
    return (
      resultingColor.r === targetColor.r &&
      resultingColor.g === targetColor.g &&
      resultingColor.b === targetColor.b
    );
  });
  return matchingPlayer;
}

function findWinnerPair({ players, targetColor, excludedPlayers = [] }) {
  const filteredPlayers = players.filter((p) => !excludedPlayers.includes(p));
  for (let index = 0; index < filteredPlayers.length; index++) {
    const player = filteredPlayers[index];
    const matchingPlayer = findMatchingPlayer(
      player,
      filteredPlayers.slice(index + 1),
      targetColor
    );
    if (matchingPlayer) {
      return [player, matchingPlayer];
    }
  }

  throw "";
}

function findRandomPlayer({ players, excludedPlayers = [] }) {
  const filteredPlayers = players.filter((p) => !excludedPlayers.includes(p));
  const randomPlayer = filteredPlayers[0];

  if (!randomPlayer) {
    throw "";
  }

  return randomPlayer;
}
function findAnotherColorPlayer({ players, color, excludedPlayers = [] }) {
  const filteredPlayers = players.filter((p) => !excludedPlayers.includes(p));
  const player = filteredPlayers.find((p) => {
    return (
      p.color.r !== color.r || p.color.g !== color.g || p.color.b !== color.b
    );
  });

  if (!player) {
    throw "";
  }

  return player;
}

async function addPlayersToGame({ instance, playerAddresses }) {
  await Promise.all(
    playerAddresses.map((playerAddress) =>
      instance.joinGame({
        from: playerAddress,
        value: web3.utils.toWei("0.1"),
        gas: 200000,
        gasPrice: 0,
      })
    )
  );

  const rawPlayers = await instance.getPlayers(playerAddresses);

  const players = rawPlayers.map((p, index) => ({
    ...p,
    index,
    address: playerAddresses[index],
  }));

  return players;
}

module.exports = {
  testSetup,
  findWinnerPair,
  findRandomPlayer,
  findAnotherColorPlayer,
  addPlayersToGame,
};
