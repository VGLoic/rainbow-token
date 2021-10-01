
var RainbowManager = artifacts.require("RainbowManager");

module.exports = function(deployer) {
  deployer.deploy(RainbowManager, 100, 150, 200);
};
