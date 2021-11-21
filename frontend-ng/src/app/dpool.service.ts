import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import DecentralizedPools from '../contract/DecentralizedPools.json';
import { DPool } from './DPool';

declare let window: any;
declare let ethers: any;

@Injectable({
  providedIn: 'root'
})
export class DpoolService {

  provider;
  signer;
  dPoolsContract;

  ethPrice;

  errorSubject = new Subject<string>();

  constructor() { }

  public setEthPrice(p) {
    this.ethPrice = p;
  }

  public async listAccounts() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts) {
      return accounts[0];
    }
    return null;
  }

  public async initContract() {
    this.dPoolsContract = new ethers.Contract(environment.dPoolContract,
      DecentralizedPools.abi, this.provider);
  }

  public async initInfura() {
    this.provider = new ethers.providers.InfuraProvider(
      'rinkeby', // or 'ropsten', 'rinkeby', 'kovan', 'goerli'
      'f506030abcda4317914e240321aac6f9'
    );
    this.signer = this.provider.getSigner();
  }

  public async initWeb3() {
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
  }

  public async getAccountBalance(address) {
    const b = await this.provider.getBalance(address);
    console.log(this.formatEth(this.getBNString(b)));
    return this.formatEth(this.getBNString(b));
  }

  public async getRecipientDPools(selectedAccount: string, currentEthPrice: number): Promise<DPool[]> {
    try {
      const dPoolIds: number[] = await this.dPoolsContract.getRecipientDPoolIds({ from: selectedAccount });
      return this.loadDPoolsByIds(selectedAccount, dPoolIds, currentEthPrice);
    } catch (e) {
      console.log('Error : ', e.message);
      return null;
    }
  }

  private async loadDPoolsByIds(selectedAccount: string, dPoolIds: number[], currentEthPrice: number): Promise<DPool[]> {
    const dPools: DPool[] = [];
    for (let i = 0; i < dPoolIds.length; i++) {
      const dPool = await this.dPoolsContract.getDPoolById(dPoolIds[i]);
      const receptorBalance = await this.dPoolsContract.balanceOf(dPoolIds[i], selectedAccount);
      const tokenName = this.getTokenName();
      const myDPool: DPool = this.convertToDPoolObject(dPool, currentEthPrice, tokenName);
      myDPool.receptorBalance = this.parseEther(receptorBalance);
      myDPool.receptorBalanceInETH = +this.formatEth(receptorBalance);
      dPools.push(myDPool);
    }
    return dPools;
  }

  public async getDPools(selectedAccount: string, currentEthPrice: number): Promise<DPool[]> {
    try {
      const dPoolCount = await this.dPoolsContract.getDPoolsCount({ from: selectedAccount });
      return this.loadAvailableDPools(selectedAccount, ethers.BigNumber.from(dPoolCount).toString(), currentEthPrice);
    } catch (e) {
      console.log('Error : ', e.message);
      return null;
    }
  }

  private async loadAvailableDPools(selectedAccount: string, dPoolsCount: number, currentEthPrice: number): Promise<DPool[]> {
    const dPools: DPool[] = [];
    for (let i = 0; i < dPoolsCount; i++) {
      const dPool = await this.dPoolsContract.getDPool(i, { from: selectedAccount });
      const tokenName = this.getTokenName();
      dPools.push(this.convertToDPoolObject(dPool, currentEthPrice, tokenName));
    }
    return dPools;
  }

  public async createDPoolOnChain(newDPool: DPool) {
    try {
      const options = {
        from: newDPool.creator,
        value: ethers.utils.parseEther(newDPool.deposit.toString()),
        gasLimit: ethers.utils.hexlify(4000000),
        gasPrice: ethers.utils.hexlify(8000000000)
      };
      const unsignedTx = await this.dPoolsContract.populateTransaction
        .createEthDPool(newDPool.dPoolName, newDPool.recipients, newDPool.startTime, newDPool.stopTime, options);
      const response = await this.signer.sendTransaction(unsignedTx);
      return await response.wait();
    } catch (e) {
      this.errorSubject.next(e.message);
      console.log(e);
    }
    return null;
  }

  public async withdrawFromDPool(dpId: string, amount: number) {
    try {
      const options = {
        from: await this.listAccounts(),
        nonce: 0
      };
      const unsignedTx = await this.dPoolsContract.populateTransaction
        .withdrawFromDPool(dpId, amount, options);
      const response = await this.signer.sendTransaction(unsignedTx);
      return await response.wait();
    } catch (e) {
      this.errorSubject.next(e.message);
      console.log(e);
    }
    return null;
  }

  private convertToDPoolObject(_dPool, currentEthPrice: number, tokenName) {
    return {
      dPoolId: this.getBNString(_dPool[0]),
      dPoolName: _dPool[1],
      creator: _dPool[2],
      recipients: _dPool[3],
      deposit: +this.formatEth(_dPool[4]),
      depositDevaluated: +this.formatEth(_dPool[4]) * currentEthPrice,
      remainingBalance: +this.formatEth(_dPool[5]),
      remainingBalanceDevaluated: +this.formatEth(_dPool[5]) * currentEthPrice,
      token: _dPool[7],
      tokenName: tokenName,
      startTime: +this.getBNString(_dPool[8]) * 1000,
      stopTime: +this.getBNString(_dPool[9]) * 1000,
      type: +this.getBNString(_dPool[10]),
    } as unknown as DPool;
  }

  public parseEther(val) {
    return ethers.utils.parseEther(this.getBNString(val));
  }

  private getTokenName() {
    // TODO
    return 'TRX';
  }

  public getBNString(val): string {
    return ethers.BigNumber.from(val).toString();
  }

  public formatEth(val) {
    return ethers.utils.formatEther(val);
  }

  public getEthInWei(val): string {
    return ethers.utils.formatUnits(val, 0);
  }

  copyToCB(account) {
    this.show();
    navigator.clipboard.writeText(account);
  }

  show() {
    const x = document.getElementById("snackbar");
    x.className = "show";
    // After 3 seconds, remove the show class from DIV
    setTimeout(function () { x.className = x.className.replace("show", ""); }, 4000);
  }
}
