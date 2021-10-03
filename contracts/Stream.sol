// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

contract Stream {
    // --

    enum DSType {
        AUTO,
        MANUAL
    }

    struct DPool {
        uint256 dPoolId;
        address sender;
        address[] recipients;
        uint256 deposit;
        uint256 remainingBalance;
        uint256 ratePerSecond;
        address payable tokenAddress;
        DSType dsType;
        uint256 startTime;
        uint256 stopTime;
    }
}
