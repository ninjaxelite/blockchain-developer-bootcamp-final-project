import { Component, Input, OnInit } from '@angular/core';
import * as moment from 'moment';
import { DPool } from '../DPool';
import { DpoolService } from '../dpool.service';

@Component({
  selector: 'app-receptor',
  templateUrl: './receptor.component.html',
  styleUrls: ['./receptor.component.css']
})
export class ReceptorComponent implements OnInit {

  valueType = 'ETH';

  @Input() dPool: DPool;

  constructor(private dPoolService: DpoolService) { }

  ngOnInit(): void {
  }

  public async withdraw() {
    const selectedAccount = await this.dPoolService.listAccounts();
    let receptorBalance = await this.dPoolService.dPoolsContract
      .balanceOf(this.dPool.dPoolId, selectedAccount);
    receptorBalance = this.dPoolService.getEthInWei(receptorBalance).toString();
    if (receptorBalance > 0) {
      await this.dPoolService.withdrawFromDPool(this.dPool.dPoolId, receptorBalance);
    }
    receptorBalance = await this.dPoolService.dPoolsContract
      .balanceOf(this.dPool.dPoolId, selectedAccount);
    this.dPool.receptorBalanceInETH = +this.dPoolService.formatEth(receptorBalance);
  }

  get stopTimeReached(): boolean {
    return this.dPool.stopTime < (new Date().getTime()) ? true : false;
  }

  get balance() {
    return this.truncate(new String(this.dPool.receptorBalanceInETH), 9);
  }

  get valueName() {
    return 'ETH';
  }

  get devaluatedAmount() {
    return this.devaluate(this.dPool.receptorBalanceInETH * this.dPoolService.ethPrice);
  }

  get startTime() {
    return (moment(new Date(this.dPool.startTime))).format('DD.MM.yyyy hh:mm:ss');
  }

  get stopTime() {
    return (moment(new Date(this.dPool.stopTime))).format('DD.MM.yyyy hh:mm:ss');
  }

  truncate(str, n) {
    return (str.length > n) ? str.substr(0, n - 1) : str;
  };

  devaluate(num) {
    return new Intl.NumberFormat(`en-US`, {
      currency: `USD`,
      style: 'currency',
    }).format(num);
  }
}
