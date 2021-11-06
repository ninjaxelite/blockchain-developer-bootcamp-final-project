import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DPool } from './DPool';
import DecentralizedPools from '../contract/DecentralizedPools.json';
import * as moment from 'moment';
import { DpoolService } from './dpool.service';

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

  accounts;
  selectedAccount;
  dPools: DPool[] = [];

  disableStartAppBtn = false;
  loading: boolean = false;
  jdValue = '';
  snackbarText: string;

  // form input - new DPool
  dPoolName: string = '';
  dPoolDeposit: number;
  startDate;
  endDate;
  recipientAddress: string;
  recipients: string[] = [];

  constructor(private cdr: ChangeDetectorRef, public dPoolService: DpoolService) {

  }

  ngOnInit(): void {
    if (typeof window.ethereum === 'undefined') {
      this.disableStartAppBtn = true;
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }
    let p = {
      dPoolId: '1',
      dPoolName: 'test',
      creator: '0x0AAFf73f22398d269E3Fb1D7582F5B8CDa3A228D',
      recipients: ['0x0AAFf73f22398d269E3Fb1D7582F5B8CDa3A228D', '0x0AAFf73f22398d269E3Fb1D7582F5B8CDa3A228D'],
      deposit: 100,
      remainingBalance: 100,
      startTime: new Date().getTime(),
      stopTime: new Date().getTime()
    } as DPool;
    this.dPools.push(p);
    this.dPools.push(p);
    this.dPools.push(p);
    this.dPools.push(p);
    this.dPools.push(p);
    this.dPools.push(p);
    this.dPools.push(p);
    this.dPools.push(p);
  }

  public startApp() {
    if (!window.ethereum) {
      return;
    }
    this.loading = true;
    this.initWeb3();
    this.listAccounts();
    this.initContract();

    this.loading = false;
    this.cdr.detectChanges();
  }

  private async listAccounts() {
    this.accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

    if (this.accounts) {
      console.log('available accounts: ');
      console.log(this.accounts);
      this.selectedAccount = this.accounts[0];
      this.jdValue = this.selectedAccount;
    }
  }

  private async initContract() {
    this.dPoolsContract = new ethers.Contract('0x9B726Aad7C94c054C4cD63f51FCB4d8f030dfEdb',
      DecentralizedPools.abi, this.provider);
    console.log('dPoolsContract: ');
    console.log(this.dPoolsContract);
  }

  private async initWeb3() {
    this.provider = new ethers.providers.Web3Provider(window.ethereum)
    this.signer = this.provider.getSigner()
    console.log('connected to provider');
    this.disableStartAppBtn = false;
  }

  createDPool() {
    if (this.dPoolName == null || this.dPoolName.trim() === ''
      || this.dPoolDeposit == null || this.dPoolDeposit <= 0
      || this.startDate == null || this.endDate == null
      || this.recipients.length === 0) {
      this.errormsg.nativeElement.style = 'display: block';
      this.errormsg.nativeElement.classList.add('errormsg');
    } else {
      this.errormsg.nativeElement.classList.remove('errormsg');
      this.errormsg.nativeElement.style = 'display: none';
    }
    const newDPool = {
      dPoolName: this.dPoolName,
      creator: this.selectedAccount,
      recipients: this.recipients,
      deposit: this.dPoolDeposit,
      remainingBalance: this.dPoolDeposit,
      startTime: this.startDate.toDate().getTime(),
      stopTime: this.endDate.toDate().getTime()
    } as DPool;
    this.dPools.push(newDPool);
    this.closeForm();
  }

  addRecipient() {
    if (this.recipientAddress != null &&
      this.recipients.find(r => this.recipientAddress === r) == null) {
      this.recipients.push(this.recipientAddress);
      this.recipientAddress = null;
    }
  }

  delRecipient(recipient) {
    this.recipients.splice(this.recipients.indexOf(recipient), 1);
  }

  showDPoolForm() {
    this.form.nativeElement.style = 'display: block';
    this.form.nativeElement.classList.add('myform');
  }

  closeForm() {
    this.form.nativeElement.classList = null;
    this.form.nativeElement.style = 'display: none';
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
}
