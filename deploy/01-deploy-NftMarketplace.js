const { network } = require("hardhat");
const { developmentChains, networkConfigs } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy, log } = deployments;

    const nftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        log: true,
        args: [],
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(nftMarketplace.address, networkConfigs[chainId]["explorer_url"], args);
    }
    log("___________________________________________________");
};

module.exports.tags = ["all", "nftmarketplace"];
