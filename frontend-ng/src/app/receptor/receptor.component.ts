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
    const receptorBalance = await this.dPoolService.dPoolsContract
      .balanceOf(this.dPool.dPoolId, selectedAccount);
    console.log('balance: ');
    console.log(this.dPoolService.formatEth(receptorBalance));
    if (receptorBalance > 0) {
      await this.dPoolService.withdrawFromDPool(this.dPool.dPoolId,
        this.dPoolService.formatEth(receptorBalance));
    }
  }

  get balance() {
    return this.dPool.receptorBalance;
  }

  get valueName() {
    return 'ETH';
  }

  get devaluatedAmount() {
    return this.devaluate(this.dPool.receptorBalance);
  }

  get startTime() {
    return (moment(new Date(this.dPool.startTime))).format('DD.MM.yyyy hh:mm:ss');
  }

  get stopTime() {
    return (moment(new Date(this.dPool.stopTime))).format('DD.MM.yyyy hh:mm:ss');
  }

  devaluate(num) {
    return new Intl.NumberFormat(`en-US`, {
      currency: `USD`,
      style: 'currency',
    }).format(num);
  }
}
