const DecentralizedPools = artifacts.require('./DecentralizedPools.sol');

module.exports = async function (deployer) {
  deployer.deploy(DecentralizedPools);
};