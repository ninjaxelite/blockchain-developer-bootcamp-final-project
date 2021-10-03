// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./Stream.sol";
import "./utils/DPoolUtil.sol";

contract DecentralizedPools {
    // contract owner
    address owner;

    event CreatePool(
        uint256 dpId,
        address sender,
        address[] recipients,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    );

    // different pools by their ids
    mapping(uint256 => Stream.DPool) dPools;

    // every recipient address by dPoolId
    mapping(address => mapping(uint256 => bool)) recipientsByDPoolId;

    // ident of every new dPool
    uint256 dPoolIdCounter = 1;

    // validates inputs for new dPool
    modifier validateInput(
        address[] memory recipients,
        uint256 deposit,
        uint256 startTime,
        uint256 stopTime
    ) {
        require(
            recipients.length > 0,
            "there should be at least one recipient"
        );
        require(deposit > 0, "deposit should be greater than 0");
        require(
            startTime > block.timestamp,
            "start time should be before block.timestamp"
        );
        require(
            stopTime > startTime,
            "stopTime should be greater than startTime"
        );
        _;
    }

    // validates and stores recipients in mapping
    modifier validateAndMapRecipients(address[] memory recipients) {
        for (uint256 i = 0; i < recipients.length; i++) {
            DPoolUtil.validateRecipient(
                recipients[i],
                address(this),
                msg.sender
            );
            // map recipients by dPoolId for convinient access
            recipientsByDPoolId[recipients[i]][dPoolIdCounter] = true;
        }
        _;
    }

    // do not allow mixes of ether and tokens
    modifier noMixedValue(uint256 deposit) {
        require(
            (msg.value > 0 && deposit == 0) || (msg.value == 0 && deposit > 0),
            "mixed transfer of ether and tokens"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /*
     * @notice Creates a DPool that starts automatically calculating rates per second
     *  when startTime is reached.
     */
    function createAutoDPool(
        address[] calldata recipients,
        uint256 deposit,
        address payable tokenAddress,
        uint256 startTime,
        uint256 stopTime
    )
        public
        validateInput(recipients, deposit, startTime, stopTime)
        validateAndMapRecipients(recipients)
        returns (uint256)
    {
        return
            createDPool(
                recipients,
                deposit,
                tokenAddress,
                Stream.DSType.AUTO,
                startTime,
                stopTime
            );
    }

    /*
     * @notice Creates a DPool with a manual starter switch before calculating rates per second.
     */
    function createManualDPool(
        address[] calldata recipients,
        uint256 deposit,
        address payable tokenAddress,
        uint256 startTime,
        uint256 stopTime
    )
        public
        validateInput(recipients, deposit, startTime, stopTime)
        validateAndMapRecipients(recipients)
        returns (uint256)
    {
        return
            createDPool(
                recipients,
                deposit,
                tokenAddress,
                Stream.DSType.MANUAL,
                startTime,
                stopTime
            );
    }

    /*
     * @notice Creates a DPool that starts automatically calculating rates per second
     *  when startTime is reached.
     * @param recipients - all the recipients who will receive and withdraw from pool
     * @param deposit - the amount of ether or tokens in pool
     * @param tokenAddress - ERC20 token address
     * @param startTime - of the distribution
     * @param stopTime - of the distribution
     */
    function createDPool(
        address[] memory _recipients,
        uint256 _deposit,
        address payable _tokenAddress,
        Stream.DSType _type,
        uint256 _startTime,
        uint256 _stopTime
    ) internal noMixedValue(_deposit) returns (uint256) {
        uint256 _ratePerSecond = DPoolUtil.calculateRPS(
            _deposit,
            _startTime,
            _stopTime
        );

        Stream.DPool memory dPool = Stream.DPool({
            dPoolId: dPoolIdCounter,
            sender: msg.sender,
            recipients: _recipients,
            deposit: _deposit,
            remainingBalance: _deposit,
            ratePerSecond: _ratePerSecond,
            tokenAddress: _tokenAddress,
            dsType: _type,
            startTime: _startTime,
            stopTime: _stopTime
        });
        dPools[dPoolIdCounter] = dPool;

        if (msg.value > 0) {
            transferEther();
        } else if (msg.value == 0) {
            transferTokens(_tokenAddress, _deposit);
        }
        emit CreatePool(
            dPoolIdCounter,
            msg.sender,
            _recipients,
            _deposit,
            _tokenAddress,
            _startTime,
            _stopTime
        );

        (bool incremented, uint256 nextId) = SafeMath.tryAdd(
            dPoolIdCounter,
            uint256(1)
        );
        require(incremented, "dPoolId not incremented");

        return dPool.dPoolId;
    }

    // transfers tokens to contract
    function transferTokens(address tokenAddress, uint256 amount)
        public
        payable
    {
        bool sent = IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        require(sent, "tokens could not be sent");
    }

    // transfers ether to contract
    function transferEther() public payable {
        (bool sent, bytes memory data) = address(this).call{value: msg.value}(
            ""
        );
        require(sent, "ether could not be sent");
    }

    /*
     * @notice Calculates the accumulated balance for a single address according to passed time.
     * @param dpId - id of a dPool
     * @param requester - address of a single recipient
     * @param recipientSize - the size/length of existing recipients in dPool
     * @returns balance - of the recipient or the sender/creator of dPool
     */
    function balanceOf(
        uint256 dpId,
        address requester,
        uint256 recipientSize
    ) public view returns (uint256) {
        Stream.DPool memory dPool = dPools[dpId];
        uint256 delta = DPoolUtil.deltaOf(dPool);

        (bool totalResult, uint256 totalRecipientBalance) = SafeMath.tryMul(
            delta,
            dPool.ratePerSecond
        );
        require(totalResult);
        (bool currentResult, uint256 currentRecipientBalance) = SafeMath.tryDiv(
            totalRecipientBalance,
            recipientSize
        );
        require(currentResult);

        if (recipientsByDPoolId[requester][dPool.dPoolId]) {
            return currentRecipientBalance;
        }

        if (requester == dPool.sender) {
            (bool senderResult, uint256 senderBalance) = SafeMath.trySub(
                dPool.remainingBalance,
                totalRecipientBalance
            );
            require(senderResult);
            return senderBalance;
        }

        return 0;
    }

    function withdrawFromDPool(
        uint256 dpId,
        address requester,
        address tokenAddress,
        uint256 amount
    ) public payable {
        Stream.DPool memory dPool = dPools[dpId];
        require(dPool.remainingBalance > 0, "no remaining balance in dPool");

        uint256 cBalance = balanceOf(dpId, requester, dPool.recipients.length);
    }

    fallback() external payable {}

    receive() external payable {}
}
