import { Component, Input, OnInit } from '@angular/core';
import { DPool } from '../DPool';
import * as moment from 'moment';
import { DpoolService } from '../dpool.service';

declare let document: any;

@Component({
  selector: 'app-dpool',
  templateUrl: './dpool.component.html',
  styleUrls: ['./dpool.component.css']
})
export class DpoolComponent implements OnInit {

  jdValue = '';
  valueType = 'ETH';
  boxes: number;

  @Input() dPool: DPool;

  constructor(public dPoolService: DpoolService) { }

  ngOnInit(): void {
    if (this.dPool.type === 0) {
      this.valueType = 'ETH';
    } else {
      this.valueType = this.dPool.tokenName;
    }

    this.jdValue = this.dPool.dPoolId;
    this.boxes = Math.floor(Math.random() * 13 + 1);
  }

  // TODO
  deleteDPool() {
    //this.dPoolService.deleteDPool
  }

  get startTime() {
    return (moment(new Date(this.dPool.startTime))).format('DD.MM.yyyy hh:mm:ss A');
  }

  get stopTime() {
    return (moment(new Date(this.dPool.stopTime))).format('DD.MM.yyyy hh:mm:ss A');
  }

  devaluate(num) {
    return new Intl.NumberFormat(`en-US`, {
      currency: `USD`,
      style: 'currency',
    }).format(num);
  }

  counter(i: number) {
    return new Array(i);
  }

  arrow(poolId) {
    document.getElementById(poolId).click();
  }
}
