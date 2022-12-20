require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const RPC_URL_ETHEREUM_GOERLI_TESTNET = process.env.RPC_URL_ETHEREUM_GOERLI_TESTNET || 0;
const PRIVATE_KEY = process.env.PRIVATE_KEY || 0;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 0;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || 0;
const RPC_URL_ETHEREUM_MAINNET = process.env.RPC_URL_ETHEREUM_MAINNET;

module.exports = {
    solidity: {
        compilers: [
            { version: "0.8.7" },
            { version: "0.6.12" },
            { version: "0.6.6" },
            { version: "0.4.19" },
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        goerli: {
            url: RPC_URL_ETHEREUM_GOERLI_TESTNET,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            blockConfirmations: 6,
        },
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
            forking: {
                url: RPC_URL_ETHEREUM_MAINNET,
            },
            // allowUnlimitedContractSize: true,
            // timeout: 1800000,
            // gas: 12000000,
            // blockGasLimit: 0x1fffffffffffff,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        user: {
            default: 1,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: true,
        coinmarketcap: COINMARKETCAP_API_KEY,
        currency: "USD",
    },
};
