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
        await tToken.transfer(milo, 90000);
        const approved = await tToken.approve(milo, 9000000);
        const approvedValue = approved.logs[0].args['value'];
        assert.equal(9000000, new BN(approvedValue).toString());
        const amount = await tToken.balanceOf.call(milo);
        assert.equal(90000, new BN(amount));
    });

    describe("handle dPools", () => {

        let startTime;
        let stopTime;
        let recipients;

        const createTokenDPool = async (poolCreator, deposit) => {
            await tToken.approve(dPool.address, 90000, { from: poolCreator });
            return tx = await dPool.createTokenDPool(recipients, deposit, tToken.address, startTime, stopTime,
                { from: poolCreator });
        }

        beforeEach(() => {
            recipients = [bob, mark, maga, goku];
            date.setDate(date.getDate() + 1); // add 1 day
            startTime = date.getTime();
            date.setDate(date.getDate() + 2); // add 2 day
            stopTime = date.getTime();
        });
        /*
                it("should withdraw tokens from dPool", async () => {
                    const depositAmount = 300;
                    const tokenTX = await createTokenDPool(milo, depositAmount);
                    const dPoolId = tokenTX.logs[0].args['dpId'];
        
                    console.log("pool startTime: " + tokenTX.logs[0].args['startTime']);
                    console.log("block time: " + currentBlockTS);
        
                    await time.increase(90323244);
        
                    const blockNum = await web3.eth.getBlockNumber();
                    const block = await web3.eth.getBlock(blockNum);
                    currentBlockTS = block['timestamp'];
                    console.log("block time after: " + currentBlockTS);
        
                    const withdrawAmount = 10; //await dPool.balanceOf(dPoolId, milo);
                    const tx = await dPool.withdrawFromDPool(dPoolId, withdrawAmount, { from: milo });
                    const evt = tx.logs[0];
        
                    console.log('remain: ' + evt.args['remainingBalance']);
        
                    assert.equal("WithdrawFromDPool", evt.event);
                    assert.equal(depositAmount - new BN(withdrawAmount), evt.args['remainingBalance']);
                });*/

        it("should withdraw creator tokens from dPool", async () => {
            const depositAmount = 300;
            const tokenTX = await createTokenDPool(milo, depositAmount);
            const dPoolId = tokenTX.logs[0].args['dpId'];

            console.log("pool startTime: " + tokenTX.logs[0].args['startTime']);
            console.log("block time: " + currentBlockTS);

            await time.increase(88323244);

            const blockNum = await web3.eth.getBlockNumber();
            const block = await web3.eth.getBlock(blockNum);
            currentBlockTS = block['timestamp'];
            console.log("block time after: " + currentBlockTS);

            const withdrawAmount = await dPool.balanceOf(dPoolId, milo);
            console.log("withdraw amount: " + withdrawAmount);

            const tx = await dPool.withdrawFromDPool(dPoolId, withdrawAmount, { from: milo });
            const evt = tx.logs[0];

            console.log("remain: " + evt.args['remainingBalance']);

            assert.equal("WithdrawFromDPool", evt.event);
            assert.equal(depositAmount - new BN(withdrawAmount), evt.args['remainingBalance']);
        });/*
                
                        it("should create a dPool containing given tokens", async () => {
                
                            const approved = await tToken.approve(dPool.address, 90000, { from: milo });
                            assert.equal(90000, new BN(approved.logs[0].args['value']));
                
                            const tx = await dPool.createTokenDPool(recipients, 300, tToken.address, startTime, stopTime,
                                { from: milo });
                            const ev = tx.logs[0];
                
                            assert.equal("CreateDPool", ev.event);
                            assert.equal(300, ev.args['deposit']);
                            assert.equal(4, ev.args['recipients'].length);
                            assert.equal(1736111111111, new BN(ev.args['ratePerSecond']).toString());
                        });
                                
                                        it("should create dPool containing given ether", async () => {
                                            const tx = await dPool.createEthDPool(recipients, startTime, stopTime,
                                                { from: milo, value: 2e+18 });
                                            const ev = tx.logs[0];
                                
                                            assert.equal("CreateDPool", ev.event);
                                            assert.equal(2, web3.utils.fromWei(ev.args['deposit'], 'ether'));
                                            assert.equal(4, ev.args['recipients'].length);
                                            assert.equal(23148148416, new BN(ev.args['ratePerSecond']).toString());
                                        });
                                
                                        it("should require recipients", async () => {
                                            let exc;
                                
                                            await dPool.createEthDPool([], startTime, stopTime, { from: milo, value: 2e+18 })
                                                .catch(e => exc = e.reason);
                                
                                            assert.equal('there should be at least one recipient', exc);
                                        });
                                
                                        it("should have deposit greater 0", async () => {
                                            let exc;
                                
                                            await dPool.createEthDPool(recipients, startTime, stopTime, { from: milo, value: 0 })
                                                .catch(e => exc = e.reason);
                                
                                            assert.equal('deposit should be greater than 0', exc);
                                        });
                                
                                        it("should have startTime after block.timestamp", async () => {
                                            const dateL = new Date(date.getTime());
                                            dateL.setDate(dateL.getDate() - 10);
                                
                                            const startTime = dateL.getTime();
                                            let exc;
                                
                                            await dPool.createEthDPool(recipients, startTime, stopTime, { from: milo, value: 2e+18 })
                                                .catch(e => exc = e.reason);
                                
                                            assert.equal('start time should be after block.timestamp', exc);
                                        });
                                
                                        it("should have stopTime after startTime", async () => {
                                            let exc;
                                            const stopTime = startTime - 100;
                                
                                            await dPool.createEthDPool(recipients, startTime, stopTime, { from: milo, value: 2e+18 })
                                                .catch(e => exc = e.reason);
                                
                                            assert.equal('stopTime should be greater than startTime', exc);
                                        });
                                
                                        it("should have a valid recipient address", async () => {
                                            let exc;
                                
                                            await dPool.createEthDPool([emptyAddress], startTime, stopTime, { from: milo, value: 2e+18 })
                                                .catch(e => exc = e.reason);
                                
                                            assert.equal('no recipient address provided', exc);
                                        });
                                
                                        it("should not have contract address as recipient", async () => {
                                            let exc;
                                
                                            await dPool.createEthDPool([dPool.address], startTime, stopTime, { from: milo, value: 2e+18 })
                                                .catch(e => exc = e.reason);
                                
                                            assert.equal('recipient should not be this contract', exc);
                                        });
                                
                                        it("should not have sender as recipient", async () => {
                                            let exc;
                                
                                            await dPool.createEthDPool([milo], startTime, stopTime, { from: milo, value: 2e+18 })
                                                .catch(e => exc = e.reason);
                                
                                            assert.equal('recipient should not be sender', exc);
                                        });
                                */
    });
});