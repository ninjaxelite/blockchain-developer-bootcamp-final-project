import { Component, Input, OnInit } from '@angular/core';
import { DPool } from '../DPool';
import * as moment from 'moment';
import { DpoolService } from '../dpool.service';
import { HttpClient } from '@angular/common/http';

declare let document: any;

@Component({
  selector: 'app-dpool',
  templateUrl: './dpool.component.html',
  styleUrls: ['./dpool.component.css']
})
export class DpoolComponent implements OnInit {

  jdValue = '';
  valueType = 'ETH';

  @Input() dPool: DPool;

  constructor(public dPoolService: DpoolService) { }

  ngOnInit(): void {
    if (this.dPool.type === 0) {
      this.valueType = 'ETH';
    } else {
      this.valueType = this.dPool.tokenName;
    }

    this.jdValue = this.dPool.dPoolId;
  }

  // TODO
  deleteDPool() {
    //this.dPoolService.deleteDPool
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



  arrow(poolId) {
    document.getElementById(poolId).click();
  }
}
