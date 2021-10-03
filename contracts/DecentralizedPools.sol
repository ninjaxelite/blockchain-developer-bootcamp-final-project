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
    address owner;

    event CreateDPool(
        uint256 dpId,
        address sender,
        address[] recipients,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
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
        uint256 dPoolBalance,
        uint256 recipientBalances
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
            stopTime: _stopTime,
            isCreated: true
        });
        dPools[dPoolIdCounter] = dPool;

        transfer(dPool.tokenAddress, dPool.deposit, msg.value);

        emit CreateDPool(
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
    function transferEther(uint256 amount) public payable {
        (bool sent, bytes memory data) = address(this).call{value: amount}("");
        require(sent, "ether could not be sent");
    }

    // transfer either tokens or ether
    function transfer(
        address tokenAddress,
        uint256 tokenAmount,
        uint256 ethAmount
    ) internal {
        if (DPoolUtil.isContract(tokenAddress)) {
            transferTokens(tokenAddress, tokenAmount);
        } else if (tokenAddress == address(0x0)) {
            transferEther(ethAmount);
        }
    }

    function transferEachRecipientBalance(
        address tokenAddress,
        address[] memory recipients
    ) internal returns (uint256) {
        // -----####
    }

    /*
     * @notice Calculates the accumulated balance for a single address according to passed time.
     * @param dpId - id of a dPool
     * @param requester - address of a single recipient
     * @param recipientSize - the size/length of existing recipients in dPool
     * @returns balance - of the recipient or the sender/creator of dPool
     */
    function balanceOf(Stream.DPool memory dPool, address requester)
        public
        view
        returns (uint256)
    {
        uint256 delta = DPoolUtil.deltaOf(dPool);

        (bool totalResult, uint256 totalRecipientBalance) = SafeMath.tryMul(
            delta,
            dPool.ratePerSecond
        );
        require(totalResult);
        (bool currentResult, uint256 currentRecipientBalance) = SafeMath.tryDiv(
            totalRecipientBalance,
            dPool.recipients.length
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
        Stream.DPool memory dPool = dPools[dpId];
        require(dPool.isCreated, "DPool does not exist");
        require(dPool.remainingBalance > 0, "no remaining balance in dPool");
        require(
            msg.sender == dPool.sender || recipientsByDPoolId[msg.sender][dpId],
            "recipient is not registered in dPool"
        );

        uint256 cBalance = balanceOf(dPool, msg.sender);
        require(cBalance >= amount, "no balance left for requester");

        (bool result, uint256 newVal) = SafeMath.trySub(
            dPool.remainingBalance,
            amount
        );
        require(result, "remainging balance calculation failed");

        if (dPool.remainingBalance == 0) {
            delete dPools[dpId];
            delete recipientsByDPoolId[msg.sender][dpId];
        }

        transfer(dPool.tokenAddress, amount, amount);

        emit WithdrawFromDPool(
            dpId,
            msg.sender,
            amount,
            dPool.remainingBalance
        );

        return true;
    }

    function deleteDPool(uint256 dpId) external returns (bool) {
        Stream.DPool memory dPool = dPools[dpId];
        require(dPool.isCreated, "DPool does not exist");
        require(
            msg.sender == dPool.sender || recipientsByDPoolId[msg.sender][dpId],
            "deletion of dPool is not allowed"
        );

        uint256 dPoolBalance = balanceOf(dPool, dPool.sender);

        if (dPoolBalance > 0) {
            transfer(dPool.tokenAddress, dPoolBalance, dPoolBalance);
        }

        uint256 recipientBalances = transferEachRecipientBalance(
            dPool.tokenAddress,
            dPool.recipients
        );

        delete dPools[dpId];
        delete recipientsByDPoolId[msg.sender][dpId];

        emit DeleteDPool(
            dpId,
            dPool.sender,
            dPool.recipients,
            dPoolBalance,
            recipientBalances
        );
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

        uint256 dPoolBalance = balanceOf(dPool, dPool.sender);
        transfer(dPool.tokenAddress, dPoolBalance, dPoolBalance);
    }

    fallback() external payable {}

    receive() external payable {}
}
