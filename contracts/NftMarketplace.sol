// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

// Import library
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// Custom Error
error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForListing();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();

contract NftMarketplace {
    // Declare variables
    struct Listing {
        uint256 price;
        address seller;
    }

    mapping(address => mapping(uint256 => Listing)) s_listings;

    // Event
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    /** Modifier */
    // Nft must not be listed
    modifier notListed(address nftAddress, uint256 tokenId) {
        if (s_listings[nftAddress][tokenId].price > 0)
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        _;
    }

    // Only owner
    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        if (IERC721(nftAddress).ownerOf(tokenId) != spender)
            revert NftMarketplace__NotOwner();
        _;
    }

    /** Constructor */
    constructor() {}

    /** Functions */

    /**
     * @notice Method for listing nft on the marketplace
     * @param nftAddress: address of the NFT
     * @param tokenId: token id of the NFT
     * @param price: price to sell
     * @dev this function only make approval for the `NftMarketplace` contract
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForListing();
        }

        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }
}
