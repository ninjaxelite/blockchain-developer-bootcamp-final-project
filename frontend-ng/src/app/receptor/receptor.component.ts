import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
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

  isWbtnDisabled = false;

  constructor(private dPoolService: DpoolService) { }

  ngOnInit(): void {
    if (this.dPool.receptorBalanceInETH > 0) {
      this.isWbtnDisabled = false;
    } else {
      this.isWbtnDisabled = true;
    }
  }

  public async withdraw() {
    const selectedAccount = await this.dPoolService.listAccounts();
    let receptorBalance = await this.dPoolService.dPoolsContract
      .balanceOf(this.dPool.dPoolId, selectedAccount);
    receptorBalance = this.dPoolService.getEthInWei(receptorBalance).toString();
    if (receptorBalance > 0) {
      await this.dPoolService.withdrawFromDPool(this.dPool.dPoolId, receptorBalance)
        .finally(() => {
          this.dPool.receptorBalanceInETH = 0;
          this.isWbtnDisabled = true;
        });
    }
  }

  get stopTimeReached(): boolean {
    return this.dPool.stopTime < (new Date().getTime())
      && this.dPool.receptorBalanceInETH === 0 ? true : false;
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
    return (moment(new Date(this.dPool.startTime))).format('DD.MM.yyyy hh:mm:ss A');
  }

  get stopTime() {
    return (moment(new Date(this.dPool.stopTime))).format('DD.MM.yyyy hh:mm:ss A');
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
