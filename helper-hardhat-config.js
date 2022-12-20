const { ethers } = require("hardhat");

const networkConfigs = {
    5: {
        name: "goerli",
        entranceFee: ethers.utils.parseEther("0.01"),
        mintFee: "1000000000000000",
        explorer_url: "https://goerli.etherscan.io/",
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        mintFee: "10000000000000000",
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfigs,
    developmentChains,
};
