// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./Stream.sol";
import "./utils/DPoolUtil.sol";

/*
 * Extended Streaming protocol
 */
contract DecentralizedPools {
    // --

    // contract owner
    address public owner;

    event CreateDPool(
        uint256 dpId,
        address sender,
        address[] recipients,
        uint256 deposit,
        uint256 ratePerSecond,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        uint256 vType
    );

    event WithdrawFromDPool(
        uint256 dpId,
        address receiver,
        uint256 amount,
        uint256 remainingBalance
    );

    event DeleteDPool(
        uint256 dpId,
        address sender,
        address[] recipients,
        uint256 dPoolBalance
    );

    event DeleteRecipientsFromDPool(
        uint256 dpId,
        address sender,
        address recipient,
        uint256 dPoolBalance
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
            startTime >= block.timestamp,
            "start time should be after block.timestamp"
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

            /*
            TODO Use modifiers only for checks
            move to function
            */
            // map recipients by dPoolId for convinient access
            recipientsByDPoolId[recipients[i]][dPoolIdCounter] = true;
        }
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function getDPool(uint256 dpId)
        public
        view
        returns (
            uint256,
            address,
            address[] memory,
            uint256,
            uint256,
            uint256,
            address,
            uint256,
            uint256,
            bool,
            uint256
        )
    {
        Stream.DPool memory dPool = dPools[dpId];
        return (
            dPool.dPoolId,
            dPool.creator,
            dPool.recipients,
            dPool.deposit,
            dPool.remainingBalance,
            dPool.ratePerSecond,
            dPool.tokenAddress,
            dPool.startTime,
            dPool.stopTime,
            dPool.isCreated,
            dPool.dVType
        );
    }

    /*
     * @notice Creates a DPool that starts automatically calculating rates per second
     *  when startTime is reached.
     */
    function createEthDPool(
        address[] calldata recipients,
        uint256 startTime,
        uint256 stopTime
    )
        public
        payable
        validateInput(recipients, msg.value, startTime, stopTime)
        validateAndMapRecipients(recipients)
        returns (uint256)
    {
        return
            createDPool(
                recipients,
                msg.value,
                payable(address(0x0)),
                uint256(Stream.DValueType.ETH),
                startTime,
                stopTime
            );
    }

    /*
     * @notice Creates a DPool with a manual starter switch before calculating rates per second.
     */
    function createTokenDPool(
        address[] calldata recipients,
        uint256 deposit,
        address payable tokenAddress,
        uint256 startTime,
        uint256 stopTime
    )
        public
        payable
        validateInput(recipients, deposit, startTime, stopTime)
        validateAndMapRecipients(recipients)
        returns (uint256)
    {
        return
            createDPool(
                recipients,
                toWei(deposit),
                tokenAddress,
                uint256(Stream.DValueType.TOKEN),
                startTime,
                stopTime
            );
    }

    /*
     * @notice Creates a DPool that starts automatically calculating rates per second
     *  when startTime is reached.
     * @param _recipients - all the recipients who will receive and withdraw from pool
     * @param _deposit - the amount of ether or tokens in pool
     * @param _tokenAddress - ERC20 token address
     * @param _type used value type
     * @param _startTime - of the distribution
     * @param _stopTime - of the distribution
     */
    function createDPool(
        address[] calldata _recipients,
        uint256 _deposit,
        address payable _tokenAddress,
        uint256 _type,
        uint256 _startTime,
        uint256 _stopTime
    ) internal returns (uint256) {
        uint256 _ratePerSecond = DPoolUtil.calculateRPS(
            _deposit,
            _startTime,
            _stopTime,
            _type
        );

        Stream.DPool memory dPool = Stream.DPool({
            dPoolId: dPoolIdCounter,
            creator: msg.sender,
            recipients: _recipients,
            deposit: _deposit,
            remainingBalance: _deposit,
            ratePerSecond: _ratePerSecond,
            tokenAddress: _tokenAddress,
            dVType: _type,
            startTime: _startTime,
            stopTime: _stopTime,
            isCreated: true
        });
        dPools[dPoolIdCounter] = dPool;

        transfer(_tokenAddress, _type, _deposit, msg.value);

        emit CreateDPool(
            dPoolIdCounter,
            msg.sender,
            _recipients,
            _deposit,
            _ratePerSecond,
            _tokenAddress,
            _startTime,
            _stopTime,
            _type
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
    function transferEther(uint256 amount) public payable {
        (bool sent, bytes memory data) = address(this).call{value: amount}("");
        require(sent, "ether could not be sent");
    }

    // transfer either tokens or ether
    function transfer(
        address tokenAddress,
        uint256 dVType,
        uint256 tokenAmount,
        uint256 ethAmount
    ) internal {
        if (uint256(Stream.DValueType.TOKEN) == dVType) {
            transferTokens(tokenAddress, tokenAmount);
        } else if (tokenAddress == address(0x0)) {
            transferEther(ethAmount);
        }
    }

    /*
     * @notice Calculates the accumulated balance for a single address according to passed time.
     * @param dpId - id of a dPool
     * @param requester - address of a single recipient
     * @param recipientSize - the size/length of existing recipients in dPool
     * @returns balance - of the recipient or the sender/creator of dPool
     */
    function balanceOf(uint256 dpId, address requester)
        public
        view
        returns (uint256)
    {
        Stream.DPool memory dPool = dPools[dpId];
        uint256 delta = DPoolUtil.deltaOf(dPool);

        (bool totalResult, uint256 totalRecipientBalance) = SafeMath.tryMul(
            delta,
            dPool.ratePerSecond
        );
        require(totalResult, "delta * rate issue");
        require(
            totalRecipientBalance > 0,
            "balanceOf totalRecipientBalance is zero"
        );

        (bool currentResult, uint256 individualRecipientBalance) = SafeMath
            .tryDiv(totalRecipientBalance, dPool.recipients.length);
        require(currentResult, "balanceOf division not possible");

        if (recipientsByDPoolId[requester][dPool.dPoolId]) {
            return individualRecipientBalance;
        }

        if (requester == dPool.creator) {
            (bool senderResult, uint256 senderBalance) = SafeMath.trySub(
                dPool.remainingBalance,
                totalRecipientBalance
            );
            require(senderResult, "balanceOf substraction issue");

            return senderBalance;
        }

        return 0;
    }

    /*
     * @notice Sender will receive requested amount, if the registered address is in dPool
     *  and remaingBalance of dPool is greater zero.
     * @param dpId - identification of dPool
     * @param amount - requested from sender
     * @returns true - if function executes fantastically
     */
    function withdrawFromDPool(uint256 dpId, uint256 amount)
        public
        payable
        returns (bool)
    {
        /* To safe transaction cost some call constraints are deliberately inside the function
            and not in modifiers.
        */
        require(amount > 0, "amount is zero");
        Stream.DPool storage dPool = dPools[dpId];
        require(dPool.isCreated, "DPool does not exist");
        require(dPool.remainingBalance > 0, "no remaining balance in dPool");
        require(
            msg.sender == dPool.creator ||
                recipientsByDPoolId[msg.sender][dpId],
            "recipient is not registered in dPool"
        );

        uint256 cBalance = balanceOf(dpId, msg.sender);
        require(cBalance >= amount, "requested higher amount than remains");

        (bool result, uint256 newRemainingBalance) = SafeMath.trySub(
            dPool.remainingBalance,
            amount
        );
        require(result, "remainging balance calculation failed");

        dPool.remainingBalance = newRemainingBalance;

        transfer(dPool.tokenAddress, dPool.dVType, amount, amount);

        if (dPool.remainingBalance == 0) {
            delete dPools[dpId];
            delete recipientsByDPoolId[msg.sender][dpId];
        }

        emit WithdrawFromDPool(
            dpId,
            msg.sender,
            amount,
            dPool.remainingBalance
        );

        return true;
    }

    /*
     * @notice Deletes dPool for given dpId and send remaining balance to creator
     */
    function deleteDPool(uint256 dpId) external returns (bool) {
        Stream.DPool memory dPool = dPools[dpId];
        require(dPool.isCreated, "DPool does not exist");
        require(
            msg.sender == dPool.creator ||
                recipientsByDPoolId[msg.sender][dpId],
            "deletion of dPool is not allowed"
        );

        uint256 dPoolBalance = balanceOf(dpId, dPool.creator);

        if (dPoolBalance > 0) {
            transfer(
                dPool.tokenAddress,
                dPool.dVType,
                dPoolBalance,
                dPoolBalance
            );
        }

        transferRecipientBalances(dPool);

        delete dPools[dpId];
        delete recipientsByDPoolId[msg.sender][dpId];

        emit DeleteDPool(dpId, dPool.creator, dPool.recipients, dPoolBalance);

        return true;
    }

    function deleteRecipientFromDPool(uint256 dpId, address recipient)
        external
        returns (bool)
    {
        Stream.DPool memory dPool = dPools[dpId];
        require(dPool.isCreated, "DPool does not exist");
        require(
            recipientsByDPoolId[msg.sender][dpId],
            "deletion of dPool is not allowed"
        );

        uint256 dPoolBalance = balanceOf(dpId, recipient);
        transfer(dPool.tokenAddress, dPool.dVType, dPoolBalance, dPoolBalance);

        emit DeleteRecipientsFromDPool(
            dpId,
            dPool.creator,
            recipient,
            dPoolBalance
        );

        return true;
    }

    function transferRecipientBalances(Stream.DPool memory dPool) internal {
        for (uint256 i = 0; i < dPool.recipients.length; i++) {
            uint256 recipientBalance = balanceOf(
                dPool.dPoolId,
                dPool.recipients[i]
            );

            if (recipientBalance > 0) {
                transfer(
                    dPool.tokenAddress,
                    dPool.dVType,
                    recipientBalance,
                    recipientBalance
                );
            }
        }
    }

    function toWei(uint256 balance) internal pure returns (uint256) {
        return balance * 10**18;
    }

    fallback() external payable {}

    receive() external payable {}
}
