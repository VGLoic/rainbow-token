// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

import "./RainbowToken.sol";

contract RainbowManager {
  RainbowToken game;

  constructor(
    uint8 r,
    uint8 g,
    uint8 b
  ) {
    address managerAddress = address(this);
    game = new RainbowToken(managerAddress, r, g, b);
  }

  function claimVictory(
    uint8 r,
    uint8 g,
    uint8 b
  ) external {
    // require(r > 5 && r < 250 && g > 5 && g < 250 && b > 5 && b < 250, "Target color is too close to a base color");
    game.claimVictory(msg.sender);
    address managerAddress = address(this);
    game = new RainbowToken(managerAddress, r, g, b);
  }

  function getGameAddress() external view returns (address) {
    return address(game);
  }
}
