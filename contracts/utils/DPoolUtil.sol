// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../Stream.sol";

library DPoolUtil {
    // --

    /*
     * @title ERC-1620 Money Pooling Standard
     * @author Sablier
     * @dev See https://eips.ethereum.org/EIPS/eip-1620
     *
     * @notice Returns either the delta in seconds between `block.timestamp` and `startTime` or
     *  between `stopTime` and `startTime, whichever is smaller. If `block.timestamp` is before
     *  `startTime`, it returns 0.
     * @dev Throws if the id does not point to a valid pool.
     * @param poolId The id of the pool for which to query the delta.
     * @return The time delta in seconds.
     */
    function deltaOf(Stream.DPool memory pool)
        internal
        view
        returns (uint256 delta)
    {
        if (block.timestamp <= pool.startTime) {
            return 0;
        }
        if (block.timestamp < pool.stopTime) {
            return block.timestamp - pool.startTime;
        }
        return pool.stopTime - pool.startTime;
    }

    function calculateRPS(
        uint256 _deposit,
        uint256 _startTime,
        uint256 _stopTime
    ) internal pure returns (uint256) {
        (bool substracted, uint256 duration) = SafeMath.trySub(
            _stopTime,
            _startTime
        );
        require(substracted, "stopTime is greater than startTime");

        (bool divided, uint256 _ratePerSecond) = SafeMath.tryDiv(
            _deposit,
            duration
        );
        require(divided, "division by 'zero' may have occured");

        return _ratePerSecond;
    }

    function validateRecipient(
        address recipient,
        address myContract,
        address sender
    ) internal pure {
        require(recipient != address(0x0), "no recipient address provided");
        require(
            recipient != myContract,
            "recipient should not be this contract"
        );
        require(recipient != sender, "recipient should not be sender");
    }

    function isContract(address _addr) internal view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}
