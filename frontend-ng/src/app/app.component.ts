import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DPool } from './DPool';
import * as moment from 'moment';
import { DpoolService } from './dpool.service';
import { HttpClient } from '@angular/common/http';
import { CapResponse } from './external-api/CapResponse';

declare let window: any;
declare let ethers: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  @ViewChild('metamask') metamaskBtn: ElementRef;
  @ViewChild('form') form: ElementRef;
  @ViewChild('errormsg') errormsg: ElementRef;

  provider;
  signer;
  dPoolsContract;

  currentEthPrice;

  selectedAccount;
  dPools: DPool[] = [];

  disableStartAppBtn = false;
  loading: boolean = false;
  jdValue = '';
  snackbarText: string;

  // form input - new DPool
  dPoolName: string = 'sample';
  dPoolDeposit: number = 10;
  startDate = moment('11/8/2021');
  endDate = moment('11/12/2021');
  recipientAddress: string;
  recipients: string[] = ['0xF9a2dE6F58f09d13c3663eA7A17e099af7e6b86F'];

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
    this.provider = await this.dPoolService.initWeb3();
    this.signer = this.provider.getSigner();
    this.disableStartAppBtn = false;

    this.selectedAccount = await this.dPoolService.listAccounts();
    this.jdValue = this.selectedAccount;
    this.dPoolsContract = await this.dPoolService.initContract(this.provider);

    this.getDPools();

    this.loading = false;
    this.cdr.detectChanges();
  }

  public async getDPools() {
    const myDPools: DPool[] = await this.dPoolService.getDPools(this.selectedAccount, this.dPoolsContract, this.currentEthPrice);
    myDPools.forEach(dp => this.dPools.push(dp));
  }

  public async createDPool() {
    if (this.validateForm()) {
      this.showErrormsg('Every field is required and at least one recipient address must be added!');
      return;
    } else {
      this.hideErrormsg();
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
      startTime: this.startDate.toDate().getTime(),
      stopTime: this.endDate.toDate().getTime()
    } as DPool;

    this.dPoolService.createDPoolOnChain(newDPool, this.dPoolsContract, this.signer)
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

  validateForm(): boolean {
    return this.dPoolName == null || this.dPoolName.trim() === ''
      || this.dPoolDeposit == null || this.dPoolDeposit <= 0
      || this.startDate == null || this.endDate == null
      || this.recipients.length === 0;
  }

  closeForm() {
    //this.form.nativeElement.classList = null;
    //this.form.nativeElement.style = 'display: none';
    //this.hideErrormsg();
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
