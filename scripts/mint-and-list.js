const { ethers } = require("hardhat");

const mintAndList = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace");
    const basicNft = await ethers.getContract("BasicNft");
    console.log("Minting...");
    const receipt = await (await basicNft.mintNft()).wait(1);
    const tokenId = receipt.events[0].args.tokenId;
    console.log("Approving Nft...");

    await (await basicNft.approve(nftMarketplace.address, tokenId)).wait(1);
    console.log("Listing nft...");
    await (
        await nftMarketplace.listItem(basicNft.address, tokenId, ethers.utils.parseEther("0.2"))
    ).wait(1);
};

mintAndList()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
