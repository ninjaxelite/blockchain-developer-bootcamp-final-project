import { Component, Input, OnInit } from '@angular/core';
import * as moment from 'moment';
import { DPool } from '../DPool';

@Component({
  selector: 'app-receptor',
  templateUrl: './receptor.component.html',
  styleUrls: ['./receptor.component.css']
})
export class ReceptorComponent implements OnInit {

  valueType = 'ETH';

  @Input() dPool: DPool;

  constructor() { }

  ngOnInit(): void {
  }

  public withdraw() {

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
