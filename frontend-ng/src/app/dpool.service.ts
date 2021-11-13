import { HttpClient } from '@angular/common/http';
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

  errorSubject = new Subject<string>();

  constructor(private httpClient: HttpClient) { }

  public async listAccounts() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

    if (accounts) {
      return accounts[0];
    }
    return null;
  }

  public async initContract(provider) {
    return new ethers.Contract(environment.dPoolContract,
      DecentralizedPools.abi, provider);
  }

  public async initWeb3() {
    return new ethers.providers.Web3Provider(window.ethereum)
  }

  public async getRecipientDPools(selectedAccount: string, dPoolsContract, currentEthPrice: number): Promise<DPool[]> {
    try {
      const dPoolIds: number[] = await dPoolsContract.getRecipientDPoolIds({ from: selectedAccount });
      console.log(dPoolIds);
      return this.loadDPoolsByIds(selectedAccount, dPoolsContract, dPoolIds, currentEthPrice);
    } catch (e) {
      console.log('Error : ', e.message);
      return null;
    }
  }

  private async loadDPoolsByIds(selectedAccount: string, dPoolsContract, dPoolIds: number[], currentEthPrice: number): Promise<DPool[]> {
    const dPools: DPool[] = [];
    for (let i = 0; i < dPoolIds.length; i++) {
      const dPool = await dPoolsContract.getDPoolById(dPoolIds[i]);
      const receptorBalance = await dPoolsContract.balanceOf(dPoolIds[i], selectedAccount);
      const tokenName = this.getTokenName();
      const myDPool: DPool = this.convertToDPoolObject(dPool, currentEthPrice, tokenName);
      myDPool.receptorBalance = receptorBalance;
      dPools.push(myDPool);
    }
    return dPools;
  }

  public async getDPools(selectedAccount: string, dPoolsContract, currentEthPrice: number): Promise<DPool[]> {
    try {
      const dPoolCount = await dPoolsContract.getDPoolsCount({ from: selectedAccount });
      return this.loadAvailableDPools(selectedAccount, dPoolsContract, ethers.BigNumber.from(dPoolCount).toString(), currentEthPrice);
    } catch (e) {
      console.log('Error : ', e.message);
      return null;
    }
  }

  private async loadAvailableDPools(selectedAccount: string, dPoolsContract, dPoolsCount: number, currentEthPrice: number): Promise<DPool[]> {
    const dPools: DPool[] = [];
    for (let i = 0; i < dPoolsCount; i++) {
      const dPool = await dPoolsContract.getDPool(i, { from: selectedAccount });
      const tokenName = this.getTokenName();
      dPools.push(this.convertToDPoolObject(dPool, currentEthPrice, tokenName));
    }
    return dPools;
  }

  public async createDPoolOnChain(newDPool: DPool, dPoolsContract, signer) {
    try {
      const options = {
        from: newDPool.creator,
        value: ethers.utils.parseEther(newDPool.deposit.toString()),
        gasLimit: ethers.utils.hexlify(4000000),
        gasPrice: ethers.utils.hexlify(8000000000)
      };

      const unsignedTx = await dPoolsContract.populateTransaction
        .createEthDPool(newDPool.dPoolName, newDPool.recipients, newDPool.startTime, newDPool.stopTime, options);
      const response = await signer.sendTransaction(unsignedTx);
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
      startTime: +this.getBNString(_dPool[8]),
      stopTime: +this.getBNString(_dPool[9]),
      type: +this.getBNString(_dPool[10]),
    } as unknown as DPool;
  }

  private getTokenName() {
    // TODO
    return 'TRX';
  }

  private getBNString(val): string {
    return ethers.BigNumber.from(val).toString();
  }

  private formatEth(val) {
    return ethers.utils.formatEther(val);
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
