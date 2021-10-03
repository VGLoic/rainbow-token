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
    game.claimVictory(msg.sender);
    address managerAddress = address(this);
    game = new RainbowToken(managerAddress, r, g, b);
  }

  function getGameAddress() external view returns (address) {
    return address(game);
  }
}
