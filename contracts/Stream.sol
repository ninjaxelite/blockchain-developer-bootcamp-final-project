// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

contract Stream {
    // --

    enum DValueType {
        ETH,
        TOKEN
    }

    struct DPool {
        uint256 dPoolId;
        address creator;
        address[] recipients;
        uint256 deposit;
        uint256 remainingBalance;
        uint256 ratePerSecond;
        address payable tokenAddress;
        uint256 dVType;
        uint256 startTime;
        uint256 stopTime;
        bool isCreated;
    }
}
