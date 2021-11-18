import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DPool } from './DPool';
import * as moment from 'moment';
import { DpoolService } from './dpool.service';
import { HttpClient } from '@angular/common/http';
import { CapResponse } from './external-api/CapResponse';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

declare let window: any;
declare let ethers: any;

export const MY_FORMATS = {
  parse: {
    dateInput: 'l, LTS',
  },
  display: {
    dateInput: 'DD-MM-YYYY',
    monthYearLabel: 'YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'YYYY',
  },
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ]
})
export class AppComponent implements OnInit {

  @ViewChild('metamask') metamaskBtn: ElementRef;
  @ViewChild('form') form: ElementRef;
  @ViewChild('errormsg') errormsg: ElementRef;

  currentEthPrice;

  selectedAccount;
  dPools: DPool[] = [];
  recipientDPools: DPool[] = [];

  disableStartAppBtn = false;
  loading: boolean = false;
  jdValue = '';
  snackbarText: string;

  // form input - new DPool
  dPoolName: string;
  dPoolDeposit: number;
  startDate = moment();
  endDate = moment().add(1, 'days');
  recipientAddress: string;
  recipients: string[] = [];

  constructor(private cdr: ChangeDetectorRef,
    private httpClient: HttpClient,
    public dPoolService: DpoolService) {

  }

  ngOnInit(): void {
    if (typeof window.ethereum === 'undefined') {
      this.disableStartAppBtn = true;
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }

    this.httpClient.get("https://api.coinmarketcap.com/data-api/v3/tools/price-conversion?convert_id=2781&id=1027&amount=1")
      .subscribe(async (capResponseD: CapResponse) => {
        this.currentEthPrice = capResponseD.data.quote[0].price;

        if (window.ethereum.selectedAddress) {
          this.startApp();
        }
      });

    this.dPoolService.errorSubject
      .subscribe(errMsg => alert('Error: ' + errMsg));
  }

  public async startApp() {
    if (!window.ethereum) {
      return;
    }

    this.loading = true;
    this.dPoolService.setEthPrice(this.currentEthPrice);
    await this.dPoolService.initWeb3();
    this.disableStartAppBtn = false;
    this.selectedAccount = await this.dPoolService.listAccounts();
    this.jdValue = this.selectedAccount;
    await this.dPoolService.initContract();

    this.getDPools();
    this.getReceiverDPools();

    this.loading = false;
    this.cdr.detectChanges();
  }

  public async getDPools() {
    const myDPools: DPool[] = await this.dPoolService.getDPools(this.selectedAccount, this.currentEthPrice);
    myDPools.forEach(dp => this.dPools.push(dp));
  }

  public async getReceiverDPools() {
    const myDPools: DPool[] = await this.dPoolService.getRecipientDPools(this.selectedAccount, this.currentEthPrice);
    myDPools.forEach(dp => this.recipientDPools.push(dp));
  }

  public async createDPool() {
    let startSeconds;
    let stopSeconds;

    if (this.isFormInvalid()) {
      this.showErrormsg('Every field is required and at least one recipient address must be added!');
      return;
    } else {
      startSeconds = Math.ceil(this.startDate.hour(moment().hour())
        .minute(moment().minute()).add(1, 'minutes')
        .toDate().getTime() / 1000);
      stopSeconds = Math.ceil(this.endDate.hour(moment().hour())
        .minute(moment().minute())
        .toDate().getTime() / 1000);

      if (this.isTimeRangeInvalid(startSeconds, stopSeconds)) {
        this.showErrormsg('Time range is invalid! Start time must be in the future and Stop time needs to have Start time + 23h!');
        return;
      } else {
        this.hideErrormsg();
      }
    }

    this.loading = true;

    const newDPool = {
      dPoolName: this.dPoolName,
      creator: this.selectedAccount,
      recipients: this.recipients,
      deposit: this.dPoolDeposit,
      depositDevaluated: this.dPoolDeposit * this.currentEthPrice,
      remainingBalanceDevaluated: this.dPoolDeposit * this.currentEthPrice,
      remainingBalance: this.dPoolDeposit,
      startTime: startSeconds,
      stopTime: stopSeconds,
      type: 0
    } as DPool;

    this.dPoolService.createDPoolOnChain(newDPool)
      .then(response => {
        console.log(response);
        if (response) {
          this.dPools.push(newDPool);
        }
      })
      .catch(response => console.log(response))
      .finally(() => {
        this.closeForm();
        this.loading = false;
      });
  }

  addRecipient() {
    if (this.recipientAddress != null
      && this.recipients.find(r => this.recipientAddress === r) == null
      && ethers.utils.getAddress(this.recipientAddress)) {
      this.recipients.push(this.recipientAddress);
      this.recipientAddress = null;
    } else {
      this.showErrormsg('Recipient address is incorrect or it already exists!');
    }
  }

  delRecipient(recipient) {
    this.recipients.splice(this.recipients.indexOf(recipient), 1);
  }

  showDPoolForm() {
    this.form.nativeElement.style = 'display: block';
    this.form.nativeElement.classList.add('myform');
  }

  isTimeRangeInvalid(startSeconds, stopSeconds) {
    return startSeconds < Math.ceil(moment().valueOf() / 1000)
      || stopSeconds < Math.ceil(moment().add(23, 'hours').valueOf() / 1000);
  }

  isFormInvalid(): boolean {
    return this.dPoolName == null || this.dPoolName.trim() === ''
      || this.dPoolDeposit == null || this.dPoolDeposit <= 0
      || this.startDate == null || this.endDate == null
      || this.recipients.length === 0;
  }

  closeForm() {
    this.clearForm();
  }

  clearForm() {
    this.dPoolName = null;
    this.dPoolDeposit = null;
    this.startDate = null;
    this.endDate = null;
    this.recipientAddress = null;
    this.recipients = [];
  }

  disableAddRecipientBtn(): boolean {
    return this.recipientAddress == null || this.recipientAddress.trim() === '';
  }

  showErrormsg(text = null) {
    if (text) {
      this.errormsg.nativeElement.innerHTML = text;
    }
    this.errormsg.nativeElement.style = 'display: block';
    this.errormsg.nativeElement.classList.add('errormsg');
  }

  hideErrormsg() {
    this.errormsg.nativeElement.classList.remove('errormsg');
    this.errormsg.nativeElement.style = 'display: none';
  }
}
