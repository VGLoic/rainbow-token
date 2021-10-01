// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

contract RainbowToken {
    struct Color {
        uint8 r;
        uint8 g;
        uint8 b;
    }

    struct Player {
        Color defaultColor;
        Color color;
        uint256 blendingPrice;
    }

    uint256 constant DEFAULT_BLENDING_PRICE = 0.1 ether;
    uint256 constant SELF_BLEND_PRICE = 0.5 ether;

    address public manager;

    Color private target;

    mapping(address => Player) private players;
    address[] private playerList;

    bool public gameOver;

    event PlayerJoined(address playerAddress, uint8 r, uint8 g, uint8 b);
    event Blended(address playerAddress, uint8 r, uint8 g, uint8 b);
    event BlendingPriceUpdated(address playerAddress, uint256 newBlendingPrice);
    event GameOver(address winnerAddress);

    constructor(address _manager, uint8 r, uint8 g, uint8 b) {
        require(r < 256 && g < 256 && b < 256, "Invalid color arguments");
        require(_manager != address(0), "Invalid zero address for manager");
        Color memory targetColor = Color(r, g, b);
        target = targetColor;
        manager = _manager;
    }

    modifier onlyPlayer() {
        require(isPlayer(msg.sender), "Sender is not a player");
        _;
    }

    modifier gameInProgress() {
        require(!gameOver, "The game is over");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Sender is not the manager contract");
        _;
    }


    function isPlayer(address playerAddress) public view returns(bool) {
        return players[playerAddress].blendingPrice > 0;
    }

    function joinGame() gameInProgress external payable {
        require(!isPlayer(msg.sender), "Sender is already a player");
        require(msg.value >= 0.1 ether, "Not enough sent Ethers to join the game");
        
        uint256 defaultColorSeed = uint(
            keccak256(
                abi.encodePacked(
                    msg.sender,
                    blockhash(block.number - 1),
                    block.timestamp
                )
            )
        );

        Color memory color = Color(
            toPrimary((defaultColorSeed & 0xff0000) / 0xffff),
            toPrimary((defaultColorSeed & 0xff00) / 0xff),
            toPrimary(defaultColorSeed & 0xff)
        );
        players[msg.sender] = Player({
            defaultColor: color,
            color: color,
            blendingPrice: DEFAULT_BLENDING_PRICE
        });
        playerList.push(msg.sender);
        emit PlayerJoined(msg.sender, color.r, color.g, color.b);
    }

    function toPrimary(uint256 colorComponent) internal pure returns(uint8) {
        if (colorComponent > 127) {
            return 255;
        } else {
            return 0;
        }
    }

    function blend(address playerAddress, uint8 playerR, uint8 playerG, uint8 playerB) gameInProgress onlyPlayer external payable {
        Player memory otherPlayer = players[playerAddress];
        require(otherPlayer.blendingPrice > 0, "Target address is not a player");
        require(otherPlayer.color.r == playerR && otherPlayer.color.g == playerG && otherPlayer.color.b == playerB, "Color of the other player has changed, blend reverted");
        require(msg.value >= otherPlayer.blendingPrice, "Not enough sent Ethers to blend");

        (bool sent,) = playerAddress.call{value: msg.value / 2}("");
        require(sent, "Failed to send Ethers");

        Player storage blenderPlayer = players[msg.sender];
        blenderPlayer.color.r = uint8((uint16(blenderPlayer.color.r) + uint16(otherPlayer.color.r)) / 2);
        blenderPlayer.color.g = uint8((uint16(blenderPlayer.color.g) + uint16(otherPlayer.color.g)) / 2);
        blenderPlayer.color.b = uint8((uint16(blenderPlayer.color.b) + uint16(otherPlayer.color.b)) / 2);

        emit Blended(msg.sender, blenderPlayer.color.r, blenderPlayer.color.g, blenderPlayer.color.b);
    }

    function selfBlend() gameInProgress onlyPlayer external payable {
        require(msg.value >= SELF_BLEND_PRICE, "Not enough sent Ethers to self blend");
        Player storage blenderPlayer = players[msg.sender];
        blenderPlayer.color.r = uint8((uint16(blenderPlayer.color.r) + uint16(blenderPlayer.defaultColor.r)) / 2);
        blenderPlayer.color.g = uint8((uint16(blenderPlayer.color.g) + uint16(blenderPlayer.defaultColor.g)) / 2);
        blenderPlayer.color.b = uint8((uint16(blenderPlayer.color.b) + uint16(blenderPlayer.defaultColor.b)) / 2);

        emit Blended(msg.sender, blenderPlayer.color.r, blenderPlayer.color.g, blenderPlayer.color.b);
    }


    function setBlendingPrice(uint256 newBlendingPrice) gameInProgress onlyPlayer external {
        require(newBlendingPrice > 0, "Blending price must be higher than 0");
        players[msg.sender].blendingPrice = newBlendingPrice;
        emit BlendingPriceUpdated(msg.sender, newBlendingPrice);
    }

    function claimVictory(address winnerAddress) onlyManager gameInProgress external {
        require(isPlayer(winnerAddress), "Claimed winner address is not a player");
        Player memory player = players[winnerAddress];
        require(
            (player.color.r - target.r) * (player.color.r - target.r)
            + (player.color.g - target.g) * (player.color.g - target.g)
            + (player.color.b - target.b) * (player.color.b - target.b)
            <= 25, "Player is not a winner"
        );
        address contractAddress = address(this);
        (bool sent,) = winnerAddress.call{value: contractAddress.balance}("");
        require(sent, "Failed to send Ethers");

        gameOver = true;
        emit GameOver(winnerAddress);
    }

    function getPlayerList() external view returns(address[] memory) {
        return playerList;
    }

    function getTargetColor() external view returns(Color memory) {
        return target;
    }

    function getPlayer(address playerAddress) external view returns(Player memory) {
        return players[playerAddress];
    }

    function getPlayers(address[] memory playerAddresses) external view returns(Player[] memory) {
        Player[] memory returnedPlayers = new Player[](playerAddresses.length);
        for (uint i = 0; i < playerAddresses.length; i++) {
            returnedPlayers[i] = players[playerAddresses[i]];
        }
        return returnedPlayers;
    }
}