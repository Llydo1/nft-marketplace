// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

// Import library

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Custom Error
error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForListing();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed();
error NftMarketplace__PriceNotmet(
    address nftAddress,
    uint256 tokenId,
    uint256 price
);
error NftMarketplace__IsOwner();
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFail();

contract NftMarketplace is ReentrancyGuard {
    // Declare variables
    struct Listing {
        uint256 price;
        address seller;
    }

    mapping(address => mapping(uint256 => Listing)) private s_listings;

    mapping(address => uint256) private s_proceeds;

    // Event
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
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

    // must be listed
    modifier isListed(address nftAddress, uint256 tokenId) {
        if (s_listings[nftAddress][tokenId].price <= 0) {
            revert NftMarketplace__NotListed();
        }
        _;
    }

    /** Constructor */
    constructor() {}

    /** Functions */

    /**
     * @notice Method for listing nft on the marketplace
     * @param nftAddress: address of the NFT
     * @param tokenId: token id of the NFT
     * @param price: price to sell; must be positive
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

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable nonReentrant isListed(nftAddress, tokenId) {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.sender == listedItem.seller) revert NftMarketplace__IsOwner();
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotmet(
                nftAddress,
                tokenId,
                listedItem.price
            );
        }

        s_proceeds[listedItem.seller] =
            s_proceeds[listedItem.seller] +
            msg.value;
        delete s_listings[nftAddress][tokenId];
        IERC721(nftAddress).safeTransferFrom(
            listedItem.seller,
            msg.sender,
            tokenId
        );

        emit ItemBought(msg.sender, nftAddress, tokenId, msg.value);
    }

    function cancelItem(
        address nftAddress,
        uint256 tokenId
    )
        public
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function updateItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        public
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        s_listings[nftAddress][tokenId].price = price;
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function withdraw() public {
        uint256 proceed = s_proceeds[msg.sender];
        if (proceed <= 0) {
            revert NftMarketplace__NoProceeds();
        }

        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceed}("");
        if (!success) revert NftMarketplace__TransferFail();
    }

    // Pure & view function
    function getListing(
        address nftAddress,
        uint256 tokenId
    ) public view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProcceed(address seller) public view returns (uint256) {
        return s_proceeds[seller];
    }
}
