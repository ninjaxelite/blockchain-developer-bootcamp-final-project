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

  public async getDPools(selectedAccount: string, dPoolsContract, currentEthPrice: number): Promise<DPool[]> {
    try {
      const dPoolCount = await dPoolsContract.getDPoolsCount({ from: selectedAccount });
      return this.loadAvailableDPools(dPoolsContract, ethers.BigNumber.from(dPoolCount).toString(), currentEthPrice);
    } catch (e) {
      console.log('Error : ', e.message);
      return null;
    }
  }

  private async loadAvailableDPools(dPoolsContract, dPoolsCount: number, currentEthPrice: number): Promise<DPool[]> {
    const dPools: DPool[] = [];
    for (let i = 0; i < dPoolsCount; i++) {
      const dPool = await dPoolsContract.getDPool(i);
      dPools.push(this.convertToDPoolObject(dPool, currentEthPrice));
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

  private convertToDPoolObject(_dPool, currentEthPrice: number) {
    return {
      dPoolId: this.getBNString(_dPool[0]),
      dPoolName: _dPool[1],
      creator: _dPool[2],
      recipients: _dPool[3],
      deposit: +this.getBNString(_dPool[4]),
      depositDevaluated: +this.getBNString(_dPool[4]) * currentEthPrice,
      remainingBalance: +this.getBNString(_dPool[5]),
      remainingBalanceDevaluated: +this.getBNString(_dPool[5]) * currentEthPrice,
      token: _dPool[7],
      startTime: +this.getBNString(_dPool[8]),
      stopTime: +this.getBNString(_dPool[9]),
      type: this.getBNString(_dPool[11]),
    } as unknown as DPool;
  }

  private getBNString(val): string {
    return ethers.BigNumber.from(val).toString();
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
