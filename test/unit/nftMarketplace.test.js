const { expect, assert } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name) &&
    describe("Nft marketplace contract unit test", () => {
        let deployer,
            nftMarketplace,
            basicNft,
            nftMarketplace_user,
            basicNft_one,
            basicNft_user,
            price_listing;
        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            user = (await getNamedAccounts()).user;
            await deployments.fixture(["all"]);
            nftMarketplace = await ethers.getContract("NftMarketplace", deployer);
            nftMarketplace_user = await ethers.getContract("NftMarketplace", user);
            basicNft = await ethers.getContract("BasicNft", deployer);
            basicNft_user = await ethers.getContract("BasicNft", user);
            await (await basicNft.mintNft()).wait(1);
            await (await basicNft_user.mintNft()).wait(1);
            price_listing = ethers.utils.parseEther("0.1");
        });

        describe("Initialize the nft marketplace variables correctly", () => {
            it("Mapping must be none", async () => {
                const [price, seller] = await nftMarketplace.getListing(basicNft.address, 0);
                const sellerBalance = await nftMarketplace.getProcceed(deployer);
                assert.equal(price, 0);
                assert.equal(seller, ethers.constants.AddressZero);
                assert.equal(sellerBalance, 0);
            });
        });

        describe("listItem function", () => {
            it("Revert if not owner", async () => {
                await expect(nftMarketplace.listItem(basicNft.address, 1, 500)).to.be.revertedWith(
                    "NftMarketplace__NotOwner()"
                );
            });
            it("Revert if price_listing == 0", async () => {
                await expect(nftMarketplace.listItem(basicNft.address, 0, 0)).to.be.revertedWith(
                    "NftMarketplace__PriceMustBeAboveZero()"
                );
            });
            it("Revert if price_listing < 0", async () => {
                await expect(nftMarketplace.listItem(basicNft.address, 0, -500)).to.be.reverted;
            });
            it("Revert if not approve", async () => {
                await expect(
                    nftMarketplace.listItem(basicNft.address, 0, price_listing)
                ).to.be.revertedWith("NftMarketplace__NotApprovedForListing()");
            });

            describe("Approved Nft for marketplace", () => {
                beforeEach(async () => {
                    await (await basicNft.approve(nftMarketplace.address, 0)).wait(1);
                    await (await basicNft_user.approve(nftMarketplace.address, 1)).wait(1);
                });
                it("Approve, listed nft and emit an event", async () => {
                    const txReceipt = await (
                        await nftMarketplace.listItem(basicNft.address, 0, price_listing)
                    ).wait(1);
                    const [seller, nftAddress, tokenId, price] = txReceipt.events[0].args;
                    assert.equal(seller, deployer);
                    assert.equal(nftAddress, basicNft.address);
                    assert.equal(tokenId, 0);
                    assert.equal(price.toString(), price_listing.toString());
                });

                it("Revert if already listed", async () => {
                    await (
                        await nftMarketplace.listItem(basicNft.address, 0, price_listing)
                    ).wait(1);
                    await expect(
                        nftMarketplace.listItem(basicNft.address, 0, price_listing)
                    ).to.be.revertedWith(`NftMarketplace__AlreadyListed("${basicNft.address}", 0)`);
                });

                it("s_listings must update new listing", async () => {
                    await (
                        await nftMarketplace.listItem(basicNft.address, 0, price_listing)
                    ).wait(1);
                    const [price, seller] = await nftMarketplace.getListing(basicNft.address, 0);
                    assert.equal(price.toString(), price_listing.toString());
                    assert.equal(seller.toString(), deployer);
                });
            });
        });

        describe("BuyItem function", () => {
            let initialBalance;
            beforeEach(async () => {
                await (await basicNft.approve(nftMarketplace.address, 0)).wait(1);
                await (await basicNft_user.approve(nftMarketplace.address, 1)).wait(1);
                await (await nftMarketplace.listItem(basicNft.address, 0, price_listing)).wait(1);
                initialBalance = await nftMarketplace.getProcceed(user);
            });

            it("Balance of user must be zero", async () => {
                assert.equal(initialBalance, 0);
            });

            it("Revert if nft is not listed", async () => {
                await expect(
                    nftMarketplace.buyItem(basicNft.address, 1, { value: price_listing })
                ).to.be.revertedWith("NftMarketplace__NotListed()");
            });
            it("Revert if is owner/seller", async () => {
                await expect(
                    nftMarketplace.buyItem(basicNft.address, 0, { value: price_listing })
                ).to.be.revertedWith("NftMarketplace__IsOwner()");
            });
            it("Revert if price < listing price or price = 0", async () => {
                await (
                    await nftMarketplace_user.listItem(basicNft.address, 1, price_listing)
                ).wait(1);
                const price = (await nftMarketplace.getListing(basicNft.address, 1)).price;
                await expect(
                    nftMarketplace.buyItem(basicNft.address, 1, {
                        value: price_listing.sub(ethers.utils.parseEther("0.05")),
                    })
                ).to.be.revertedWith(
                    `NftMarketplace__PriceNotmet("${basicNft.address}", 1, ${price.toString()})`
                );

                await expect(
                    nftMarketplace.buyItem(basicNft.address, 1, {
                        value: 0,
                    })
                ).to.be.revertedWith(
                    `NftMarketplace__PriceNotmet("${basicNft.address}", 1, ${price.toString()})`
                );
            });

            it("event must be emitted", async () => {
                await (
                    await nftMarketplace_user.listItem(basicNft.address, 1, price_listing)
                ).wait(1);
                await expect(
                    nftMarketplace.buyItem(basicNft.address, 1, {
                        value: price_listing,
                    })
                )
                    .to.emit(nftMarketplace, "ItemBought")
                    .withArgs(deployer, basicNft.address, 1, price_listing);
            });
            describe("nft bought", () => {
                let previousOwner;
                beforeEach(async () => {
                    previousOwner = await basicNft.ownerOf(1);
                    await (
                        await nftMarketplace_user.listItem(basicNft.address, 1, price_listing)
                    ).wait(1);
                    await nftMarketplace.buyItem(basicNft.address, 1, {
                        value: price_listing,
                    });
                });

                it("s_proceeds must change", async () => {
                    const newBalance = await nftMarketplace.getProcceed(user);
                    assert.equal(
                        newBalance.toString(),
                        initialBalance.add(ethers.utils.parseEther("0.1")).toString()
                    );
                });
                it("s_listings must be delete", async () => {
                    const [price, seller] = await nftMarketplace.getListing(basicNft.address, 1);
                    assert.equal(price, 0);
                    assert.equal(seller, ethers.constants.AddressZero);
                });
                it("nft owner must changed", async () => {
                    const owner = await basicNft.ownerOf(1);
                    assert.equal(previousOwner, user);
                    assert.equal(owner, deployer);
                });
            });
        });

        describe("cancel Item function", () => {
            beforeEach(async () => {
                await (await basicNft.approve(nftMarketplace.address, 0)).wait(1);
                await (await nftMarketplace.listItem(basicNft.address, 0, price_listing)).wait(1);
            });

            it("cancelItem: Revert if is not owner", async () => {
                await expect(
                    nftMarketplace_user.cancelItem(basicNft.address, 0)
                ).to.be.revertedWith("NftMarketplace__NotOwner()");
            });
            it("cancelItem: Revert if is not listed", async () => {
                await expect(
                    nftMarketplace_user.cancelItem(basicNft.address, 1)
                ).to.be.revertedWith("NftMarketplace__NotListed()");
            });
            it("cancelItem: ItemCancel event emit", async () => {
                await expect(nftMarketplace.cancelItem(basicNft.address, 0))
                    .to.emit(nftMarketplace, "ItemCanceled")
                    .withArgs(deployer, basicNft.address, 0);
            });
            it("cancelItem: s_listings update", async () => {
                let initialPrice = (await nftMarketplace.getListing(basicNft.address, 0)).price;
                let initialSeller = (await nftMarketplace.getListing(basicNft.address, 0)).seller;
                await nftMarketplace.cancelItem(basicNft.address, 0);

                let price = (await nftMarketplace.getListing(basicNft.address, 0)).price;
                let seller = (await nftMarketplace.getListing(basicNft.address, 0)).seller;

                assert.notEqual(price.toString(), initialPrice.toString());
                assert.equal(price.toString(), 0);
                assert.notEqual(seller.toString(), initialSeller.toString());
                assert.equal(seller.toString(), ethers.constants.AddressZero);
            });
        });

        describe("update Item function", () => {
            beforeEach(async () => {
                await (await basicNft.approve(nftMarketplace.address, 0)).wait(1);
                await (await nftMarketplace.listItem(basicNft.address, 0, price_listing)).wait(1);
            });
            it("updateItem: Revert if is not owner", async () => {
                await expect(
                    nftMarketplace_user.updateItem(
                        basicNft.address,
                        0,
                        price_listing.add(price_listing)
                    )
                ).to.be.revertedWith("NftMarketplace__NotOwner()");
            });
            it("updateItem: Revert if is not listed", async () => {
                await expect(
                    nftMarketplace_user.updateItem(
                        basicNft.address,
                        1,
                        price_listing.add(price_listing)
                    )
                ).to.be.revertedWith("NftMarketplace__NotListed()");
            });

            it("updateItem: Revert if price is <= 0", async () => {
                await expect(nftMarketplace.updateItem(basicNft.address, 0, 0)).to.be.revertedWith(
                    "NftMarketplace__PriceMustBeAboveZero()"
                );
            });

            it("updateItem: event emit wtih correct args", async () => {
                await expect(
                    nftMarketplace.updateItem(basicNft.address, 0, price_listing.add(price_listing))
                )
                    .to.emit(nftMarketplace, "ItemListed")
                    .withArgs(deployer, basicNft.address, 0, ethers.utils.parseEther("0.2"));
            });
        });

        describe("Withdraw function", () => {
            beforeEach(async () => {
                await (await basicNft.approve(nftMarketplace.address, 0)).wait(1);
                await (await nftMarketplace.listItem(basicNft.address, 0, price_listing)).wait(1);
                await (
                    await nftMarketplace_user.buyItem(basicNft.address, 0, {
                        value: price_listing,
                    })
                ).wait(1);
            });
            it("withdraw: must reverted when there is no proceed", async () => {
                await expect(nftMarketplace_user.withdraw()).to.be.revertedWith(
                    "NftMarketplace__NoProceeds()"
                );
            });

            it("withdraw: withdraw, reset proceed and update balance", async () => {
                let initialBalance = await ethers.provider.getBalance(deployer);
                const receipt = await (await nftMarketplace.withdraw()).wait(1);
                const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);
                const withdrawBalance = await ethers.provider.getBalance(deployer);
                const proceed = await nftMarketplace.getProcceed(deployer);
                assert.equal(
                    withdrawBalance.toString(),
                    initialBalance.add(price_listing).sub(gasUsed).toString()
                );
                assert.equal(proceed, 0);
            });
        });
    });
