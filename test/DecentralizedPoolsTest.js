const BN = web3.utils.BN;
const DecentralizedPools = artifacts.require("DecentralizedPools");
const TestToken = artifacts.require("TestToken");
const { time } = require('@openzeppelin/test-helpers');

contract("DecentralizedPools", function (accounts) {
    const [_owner, alice, bob, mark, maga, goku, milo] = accounts;
    const emptyAddress = "0x0000000000000000000000000000000000000000";

    let currentBlockTS;
    let dPool;
    let tToken;
    let date;

    before(async () => {
        dPool = await DecentralizedPools.new();
        tToken = await TestToken.new("TestToken", "TTK");

        const blockNum = await web3.eth.getBlockNumber();
        const block = await web3.eth.getBlock(blockNum);
        currentBlockTS = block['timestamp'];
        date = new Date(currentBlockTS);
    });

    it("should have an owner", async () => {
        const owner = await dPool.owner.call();
        const deployedBy = accounts[0];
        assert.equal(deployedBy, owner);
    });

    it("should have transfered token balance", async () => {
        let tokens = web3.utils.toWei(new BN(5000), 'ether');
        const approved = await tToken.approve(milo, tokens);
        const approvedValue = approved.logs[0].args['value'];
        assert.equal(new BN(tokens), new BN(approvedValue).toString());
        await tToken.transfer(milo, tokens);
        const amount = await tToken.balanceOf.call(milo);
        assert.equal(new BN(tokens).toString(), new BN(amount).toString());
    });

    describe("handle dPools", () => {

        let startTime;
        let stopTime;
        let recipients;

        beforeEach(() => {
            recipients = [bob, mark, maga, goku];
            date.setDate(date.getDate() + 1); // add 1 day
            startTime = date.getTime();
            date.setDate(date.getDate() + 2); // add 2 day
            stopTime = date.getTime();
        });

        it("should create a dPool containing given tokens", async () => {
            const approved = await tToken.approve(dPool.address, 90000, { from: milo });
            assert.equal(90000, new BN(approved.logs[0].args['value']));

            const tx = await dPool.createTokenDPool("testPool", recipients, 300, tToken.address, startTime, stopTime,
                { from: milo });
            const ev = tx.logs[0];

            assert.equal("CreateDPool", ev.event);
            assert.equal(300, ev.args['deposit']);
            assert.equal(4, ev.args['recipients'].length);
        });

        it("should create dPool containing given ether", async () => {
            const tx = await dPool.createEthDPool("testPool", recipients, startTime, stopTime,
                { from: milo, value: 1e+18 });
            const ev = tx.logs[0];

            assert.equal("CreateDPool", ev.event);
            assert.equal(1, web3.utils.fromWei(ev.args['deposit'], 'ether'));
            assert.equal(4, ev.args['recipients'].length);
        });

        it("should withdraw recipient ethers", async () => {
            const tx = await dPool.createEthDPool("testPool", recipients, startTime, stopTime,
                { from: milo, value: 1e+18 });
            const ev = tx.logs[0];
            const dpId = ev.args['dpId'];
            const forwardTo = startTime - currentBlockTS + 60 * 120;

            await time.increase(forwardTo);

            const balance = await dPool.balanceOf(dpId, bob);
            const recipientTX = await dPool.withdrawFromDPool(dpId, balance, { from: bob });
            const withdrawLogs = recipientTX.logs[0];

            assert.equal("WithdrawFromDPool", withdrawLogs.event);
            assert.equal(bob, withdrawLogs.args['receiver']);
            assert.equal(balance, new BN(withdrawLogs.args['amount']).toString());
        });

        it("should require recipients", async () => {
            let exc;

            await dPool.createEthDPool("testPool", [], startTime, stopTime, { from: milo, value: 1e+18 })
                .catch(e => exc = e.reason);

            assert.equal('there should be at least one recipient', exc);
        });

        it("should have deposit greater 0", async () => {
            let exc;

            await dPool.createEthDPool("testPool", recipients, startTime, stopTime, { from: milo, value: 0 })
                .catch(e => exc = e.reason);

            assert.equal('deposit should be greater than 0', exc);
        });

        it("should have startTime after block.timestamp", async () => {
            const startTime = currentBlockTS - 100000000;
            let exc;

            await dPool.createEthDPool("testPool", recipients, startTime, stopTime, { from: milo, value: 1e+18 })
                .catch(e => exc = e.reason);

            assert.equal('start time should be after block.timestamp', exc);
        });

        it("should have stopTime after startTime", async () => {
            let exc;
            const stopTime = startTime - 100;

            await dPool.createEthDPool("testPool", recipients, startTime, stopTime, { from: milo, value: 1e+18 })
                .catch(e => exc = e.reason);

            assert.equal('stopTime should be greater than startTime', exc);
        });

        it("should have a valid recipient address", async () => {
            let exc;

            await dPool.createEthDPool("testPool", [emptyAddress], startTime, stopTime, { from: milo, value: 1e+18 })
                .catch(e => exc = e.reason);

            assert.equal('no recipient address provided', exc);
        });

        it("should not have contract address as recipient", async () => {
            let exc;

            await dPool.createEthDPool("testPool", [dPool.address], startTime, stopTime, { from: milo, value: 1e+18 })
                .catch(e => exc = e.reason);

            assert.equal('recipient should not be this contract', exc);
        });

        it("should not have sender as recipient", async () => {
            let exc;

            await dPool.createEthDPool("testPool", [milo], startTime, stopTime, { from: milo, value: 1e+18 })
                .catch(e => exc = e.reason);

            assert.equal('recipient should not be sender', exc);
        });
    });
});