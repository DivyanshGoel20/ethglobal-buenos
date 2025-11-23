// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title GameBank
 * @notice Accepts WBTC, WETH, WLD deposits, tracks balances in USD,
 *         and computes bullets + damage using live Pyth price feeds.
 */
contract GameBank is ReentrancyGuard {
    /* -------------------------------------------------------------------------- */
    /*                                   ERRORS                                  */
    /* -------------------------------------------------------------------------- */
    error UnsupportedToken();
    error NothingToWithdraw();
    error InsufficientBalance();

    /* -------------------------------------------------------------------------- */
    /*                                 CONSTANTS                                  */
    /* -------------------------------------------------------------------------- */

    // Supported tokens
    address public constant WBTC = 0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant WLD  = 0x814213d11614D8A4Cc1F2e3425Db0F763bca979B;

    // Pyth Feed IDs
    bytes32 public constant FEED_WBTC =
        0xc9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33;
    bytes32 public constant FEED_WETH =
        0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6;
    bytes32 public constant FEED_WLD =
        0xd6835ad1f773de4a378115eb6824bd0c0e42d84d1c84d9750e853fb6b6c7794a;

    // Game parameters
    uint256 public constant K = 4e18;               // multiplier for bullets (scaled)
    uint256 public constant BASE_DAMAGE = 10;    // base damage scaling

    uint256 public pyth_price;

    IPyth public immutable pyth;

    /* -------------------------------------------------------------------------- */
    /*                               USER STORAGE                                 */
    /* -------------------------------------------------------------------------- */

    struct UserData {
        mapping(address => uint256) tokenBalance; // balances per token
        uint256 bullets;
        uint256 damage;
    }

    mapping(address => UserData) internal users;

    uint256 internal priceWBTC;   // 1e8 decimals
    uint256 internal priceWETH;   // 1e8 decimals
    uint256 internal priceWLD;    // 1e8 decimals

    /* -------------------------------------------------------------------------- */
    /*                                CONSTRUCTOR                                 */
    /* -------------------------------------------------------------------------- */

    constructor(address pythAddress) {
        pyth = IPyth(pythAddress);
    }

    /* -------------------------------------------------------------------------- */
    /*                               PRICE HELPERS                                */
    /* -------------------------------------------------------------------------- */

    function _getFeed(address token) internal pure returns (bytes32) {
        if (token == WBTC) return FEED_WBTC;
        if (token == WETH) return FEED_WETH;
        if (token == WLD)  return FEED_WLD;
        revert UnsupportedToken();
    }

    function _getPrice(
        address token,
        bytes[] calldata priceUpdate
    ) public payable returns (uint256 price) {
        // Pay fee + update price feed
        uint256 fee = pyth.getUpdateFee(priceUpdate);
        pyth.updatePriceFeeds{value: fee}(priceUpdate);

        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        // Read price (<= 60 seconds old)
        PythStructs.Price memory p =
            pyth.getPriceNoOlderThan(_getFeed(token), 60);

        pyth_price = uint256(int256(p.price));

        // price.price has decimals = 10^p.expo
        // We normalize to 1e8 USD precision
        uint256 normalized;
        if (p.expo < -8) {
            normalized = uint256(uint64(p.price)) / (10 ** uint256(int256(-8 - p.expo)));
        } else if (p.expo > -8) {
            normalized = uint256(uint64(p.price)) * (10 ** uint256(int256(p.expo + 8)));
        } else {
            normalized = uint256(uint64(p.price));
        }

        if (token == WBTC) priceWBTC = normalized;
        else if (token == WETH) priceWETH = normalized;
        else priceWLD = normalized;

        return uint256(int256(p.price));
    }

    function getLatestPrice() public view returns (int64 price, uint64 conf, uint publishTime) {
        // Returns latest price no older than 60 seconds
        bytes32 priceFeedId = 0xd6835ad1f773de4a378115eb6824bd0c0e42d84d1c84d9750e853fb6b6c7794a; // WLD/USD
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(priceFeedId, 60);
        return (p.price, p.conf, p.publishTime);
    }

    /* -------------------------------------------------------------------------- */
    /*                            GAME STAT CALCULATIONS                           */
    /* -------------------------------------------------------------------------- */

    function _recomputeStats(address user) internal {
        UserData storage u = users[user];

        uint256 usd = 0;

        if (u.tokenBalance[WBTC] > 0)
            usd += (u.tokenBalance[WBTC] * priceWBTC) / 1e8;

        if (u.tokenBalance[WETH] > 0)
            usd += (u.tokenBalance[WETH] * priceWETH) / 1e8;

        if (u.tokenBalance[WLD] > 0)
            usd += (u.tokenBalance[WLD] * priceWLD) / 1e8;

        // ---- Bullets ----
        // bullets = floor(k * sqrt(USD))
        uint256 sqrtUsd = Math.sqrt(usd * 1e18);
        u.bullets = (K * sqrtUsd) / 1e36;

        // ---- Damage ----
        // _calculateDamage(usd);
    }

    function _calculateDamage(uint256 usd) public pure returns (uint256) {
        // tokenPrice expected to be 1e8 decimals (e.g. $0.60 = 60_000_000)

        uint256 x = (usd / 1e8) + 10;

        uint256 dmg = _ln(x) * BASE_DAMAGE;                // 1e14 precision
        // uint256 ln10 = 2302585092994045;     // ln(10) * 1e14

        return dmg;
    }

    /* -------------------------------------------------------------------------- */
    /*                               PRICE CACHING                                 */
    /* -------------------------------------------------------------------------- */

    uint256 internal _cachedPriceWBTC;
    uint256 internal _cachedPriceWETH;
    uint256 internal _cachedPriceWLD;

    function _updateAllPrices(bytes[] calldata priceUpdate) internal {
        // _cachedPriceWBTC = _getPrice(WBTC, priceUpdate);
        // _cachedPriceWETH = _getPrice(WETH, priceUpdate);
        _cachedPriceWLD  = _getPrice(WLD,  priceUpdate);
    }

    /* -------------------------------------------------------------------------- */
    /*                              DEPOSIT / WITHDRAW                             */
    /* -------------------------------------------------------------------------- */

    function deposit(
        address token,
        uint256 amount,
        bytes[] calldata priceUpdate
    ) external payable nonReentrant {
        UserData storage u = users[msg.sender];

        if (token != WBTC && token != WETH && token != WLD) revert UnsupportedToken();
        // require(amount > 0);

        uint256 cachedPrice = _getPrice(token, priceUpdate);

        // Transfer tokens
        // IERC20(token).approve(address(this), amount);
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transferFrom failed");

        // Update internals
        users[msg.sender].tokenBalance[token] += amount;

        _recomputeStats(msg.sender);

        u.damage = _calculateDamage(cachedPrice);
    }

    function withdraw(
        address token,
        uint256 amount,
        bytes[] calldata priceUpdate
    ) external payable nonReentrant {
        if (token != WBTC && token != WETH && token != WLD) revert UnsupportedToken();

        UserData storage u = users[msg.sender];
        if (u.tokenBalance[token] < amount) revert InsufficientBalance();

        uint256 cachedPrice = _getPrice(token, priceUpdate);

        u.tokenBalance[token] -= amount;

        IERC20(token).transfer(msg.sender, amount);

        _recomputeStats(msg.sender);

        u.damage = _calculateDamage(cachedPrice);    
        
    }

    /* -------------------------------------------------------------------------- */
    /*                                 VIEW HELPERS                                */
    /* -------------------------------------------------------------------------- */

    function getStats(address user)
        external
        view
        returns (uint256 bullets, uint256 damage)
    {
        UserData storage u = users[user];
        return (u.bullets, u.damage);
    }

    function getBalances(address user)
        external
        view
        returns (uint256 wbtc, uint256 weth, uint256 wld)
    {
        UserData storage u = users[user];
        return (
            u.tokenBalance[WBTC],
            u.tokenBalance[WETH],
            u.tokenBalance[WLD]
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                                MATH HELPERS                                 */
    /* -------------------------------------------------------------------------- */

    // Natural log approx (scaled)
    function _ln(uint256 x) internal pure returns (uint256) {
        // Simple Taylor expansion around 1 (only works if scaled)
        // But since price is large, use change-of-base:
        // ln(x) ≈ log2(x) * ln(2)
        uint256 log2x = Math.log2(x);
        return (log2x * 6931471805599453) / 1e16; // ln(2)*1e14
    }
}
