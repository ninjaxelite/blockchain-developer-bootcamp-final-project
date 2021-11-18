// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./Stream.sol";
import "./utils/DPoolUtil.sol";

/*
 * Extended Crypto distribution protocol
 */
contract DecentralizedPools is Pausable, Ownable {
    // -- derived from Pausable
    // emergency switch

    event CreateDPool(
        uint256 dpId,
        address sender,
        address[] recipients,
        uint256 deposit,
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

    // get all pool ids by creator
    mapping(address => uint256[]) dPoolIdsByCreator;

    // map every existing recipient address by dPoolId
    mapping(address => mapping(uint256 => bool)) recipientsByDPoolId;

    // get dPool ids by recipient
    mapping(address => uint256[]) recipientDPoolIds;

    // every recipient has a withdrawnAmount
    mapping(address => uint256) recipientWithdrawnAmount;

    // ident of every new dPool
    uint256 dPoolIdCounter = 1;

    // validates inputs for new dPool
    modifier validateInput(
        address[] calldata recipients,
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
    modifier validateRecipients(address[] calldata recipients) {
        for (uint256 i = 0; i < recipients.length; i++) {
            DPoolUtil.validateRecipient(
                recipients[i],
                address(this),
                msg.sender
            );
        }
        _;
    }

    constructor() {}

    /*
     * @notice Shutdown DPool creation.
     */
    function emergencySwitchOn() public onlyOwner {
        _pause();
    }

    /*
     * @notice Activate DPool creation.
     */
    function emergencySwitchOff() public onlyOwner {
        _unpause();
    }

    /*
     * @notice Get all dPoolIds by recipient msg address.
     */
    function getRecipientDPoolIds() external view returns (uint256[] memory) {
        return recipientDPoolIds[msg.sender];
    }

    /*
     * @notice Get all dPoolIds by creator msg address.
     */
    function getDPoolsCount() external view returns (uint256) {
        uint256[] memory _dPoolIds = dPoolIdsByCreator[msg.sender];
        return _dPoolIds.length;
    }

    /*
     * @notice Retrieve DPool by given index and the calling address.
     * @param dPoolId
     */
    function getDPool(uint256 index)
        external
        view
        returns (
            uint256,
            string memory,
            address,
            address[] memory,
            uint256,
            uint256,
            uint256,
            address,
            uint256,
            uint256,
            uint256
        )
    {
        uint256 dPoolId = dPoolIdsByCreator[msg.sender][index];
        Stream.DPool memory _dPool = dPools[dPoolId];
        return (
            _dPool.dPoolId,
            _dPool.dPoolName,
            _dPool.creator,
            _dPool.recipients,
            _dPool.deposit,
            _dPool.remainingBalance,
            _dPool.ratePerSecond,
            _dPool.tokenAddress,
            _dPool.startTime,
            _dPool.stopTime,
            _dPool.dVType
        );
    }

    /*
     * @notice Retrieve DPool by given id.
     * @param dPoolId
     */
    function getDPoolById(uint256 dPId)
        external
        view
        returns (
            uint256,
            string memory,
            address,
            address[] memory,
            uint256,
            uint256,
            uint256,
            address,
            uint256,
            uint256,
            uint256
        )
    {
        Stream.DPool memory _dPool = dPools[dPId];
        return (
            _dPool.dPoolId,
            _dPool.dPoolName,
            _dPool.creator,
            _dPool.recipients,
            _dPool.deposit,
            _dPool.remainingBalance,
            _dPool.ratePerSecond,
            _dPool.tokenAddress,
            _dPool.startTime,
            _dPool.stopTime,
            _dPool.dVType
        );
    }

    /*
     * @notice Creates a DPool with ETH.
     */
    function createEthDPool(
        string calldata dPoolName,
        address[] calldata recipients,
        uint256 startTime,
        uint256 stopTime
    )
        public
        payable
        whenNotPaused
        validateInput(recipients, msg.value, startTime, stopTime)
        returns (uint256)
    {
        return
            createDPool(
                dPoolName,
                recipients,
                msg.value,
                payable(address(0x0)),
                startTime,
                stopTime,
                uint256(Stream.DValueType.ETH)
            );
    }

    /*
     * @notice Creates a DPool with tokens.
     */
    function createTokenDPool(
        string calldata dPoolName,
        address[] calldata recipients,
        uint256 deposit,
        address payable tokenAddress,
        uint256 startTime,
        uint256 stopTime
    )
        public
        payable
        whenNotPaused
        validateInput(recipients, deposit, startTime, stopTime)
        returns (uint256)
    {
        return
            createDPool(
                dPoolName,
                recipients,
                deposit,
                tokenAddress,
                startTime,
                stopTime,
                uint256(Stream.DValueType.TOKEN)
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
        string calldata _dPoolName,
        address[] calldata _recipients,
        uint256 _deposit,
        address payable _tokenAddress,
        uint256 _startTime,
        uint256 _stopTime,
        uint256 _type
    ) internal validateRecipients(_recipients) returns (uint256) {
        mapRecipients(_recipients);
        uint256 _ratePerSecond = DPoolUtil.calculateRPS(
            _deposit,
            _startTime,
            _stopTime
        );

        Stream.DPool memory dPool = Stream.DPool({
            dPoolId: dPoolIdCounter,
            dPoolName: _dPoolName,
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

        saveDPool(dPool);
        transferToContract(_tokenAddress, _type, _deposit, msg.value);

        emit CreateDPool(
            dPoolIdCounter,
            msg.sender,
            _recipients,
            _deposit,
            _tokenAddress,
            _startTime,
            _stopTime,
            _type
        );

        dPoolIdCounter += uint256(1);

        return dPool.dPoolId;
    }

    // save given dPool on chain and map dPoolId
    function saveDPool(Stream.DPool memory dPool) private {
        dPools[dPool.dPoolId] = dPool;
        uint256[] storage creatorPoolIds = dPoolIdsByCreator[msg.sender];
        creatorPoolIds.push(dPool.dPoolId);
    }

    // transfers tokens to contract
    function transferTokens(
        address fromSender,
        address toAddress,
        address tokenAddress,
        uint256 amount
    ) public payable {
        bool sent = IERC20(tokenAddress).transferFrom(
            fromSender,
            toAddress,
            amount
        );
        require(sent, "tokens could not be sent");
    }

    // transfers ether to contract
    function transferEther(address requester, uint256 amount) public payable {
        (bool sent, bytes memory data) = requester.call{value: amount}("");
        require(sent, "ether could not be sent");
    }

    // transfer tokens or ether
    function transferToContract(
        address tokenAddress,
        uint256 dVType,
        uint256 tokenAmount,
        uint256 ethAmount
    ) internal {
        if (uint256(Stream.DValueType.TOKEN) == dVType) {
            transferTokens(
                msg.sender,
                address(this),
                tokenAddress,
                tokenAmount
            );
        } else if (tokenAddress == address(0x0)) {
            transferEther(address(this), ethAmount);
        }
    }

    // withdraw tokens or ether
    function withdrawFromContract(
        address tokenAddress,
        uint256 dVType,
        uint256 tokenAmount,
        uint256 ethAmount
    ) internal {
        if (uint256(Stream.DValueType.TOKEN) == dVType) {
            transferTokens(
                address(this),
                msg.sender,
                tokenAddress,
                tokenAmount
            );
        } else if (tokenAddress == address(0x0)) {
            transferEther(msg.sender, ethAmount);
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

        if (totalRecipientBalance == 0) {
            return 0;
        }

        (bool currentResult, uint256 individualRecipientBalance) = SafeMath
            .tryDiv(totalRecipientBalance, dPool.recipients.length);
        require(currentResult, "balanceOf division not possible");

        uint256 receptorWithdrawnAmount = recipientWithdrawnAmount[requester];

        if (receptorWithdrawnAmount > 0) {
            (bool withdrawResult, uint256 withdrawn) = SafeMath.trySub(
                dPool.deposit,
                dPool.remainingBalance
            );
            require(withdrawResult, "problem with withdraw result");
            if (requester == dPool.creator) {
                (
                    bool exactResultCreator,
                    uint256 exactRemainsCreator
                ) = SafeMath.trySub(totalRecipientBalance, withdrawn);
                require(exactResultCreator, "problem with creators result");
                totalRecipientBalance = exactRemainsCreator;
            } else {
                (bool exactResult, uint256 exactRemains) = SafeMath.trySub(
                    individualRecipientBalance,
                    withdrawn
                );
                require(exactResult, "problem with receptors exact result");
                individualRecipientBalance = exactRemains;
            }
        }

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

    event Logger(string txt, address sender, address spender, uint256 l);

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

        withdrawFromContract(dPool.tokenAddress, dPool.dVType, amount, amount);

        uint256 receptorWithdrawnAmount = recipientWithdrawnAmount[msg.sender];
        recipientWithdrawnAmount[msg.sender] = receptorWithdrawnAmount + amount;

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
            withdrawFromContract(
                dPool.tokenAddress,
                dPool.dVType,
                dPoolBalance,
                dPoolBalance
            );
        }

        transferRecipientBalances(dPool);

        // TODO delete creator pool id !!!!

        uint256[] storage creatorPoolIds = dPoolIdsByCreator[msg.sender];

        if (creatorPoolIds.length == 0) {
            delete dPoolIdsByCreator[msg.sender];
        }
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
        withdrawFromContract(
            dPool.tokenAddress,
            dPool.dVType,
            dPoolBalance,
            dPoolBalance
        );

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
                withdrawFromContract(
                    dPool.tokenAddress,
                    dPool.dVType,
                    recipientBalance,
                    recipientBalance
                );
            }
        }
    }

    // maps given recipients by dPoolId
    function mapRecipients(address[] calldata recipients) internal {
        for (uint256 i = 0; i < recipients.length; i++) {
            recipientsByDPoolId[recipients[i]][dPoolIdCounter] = true;
            uint256[] storage dPIds = recipientDPoolIds[recipients[i]];
            dPIds.push(dPoolIdCounter);
        }
    }

    fallback() external payable {}

    receive() external payable {}
}
