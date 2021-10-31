import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DPool } from './DPool';
import DecentralizedPools from '../contract/DecentralizedPools.json';

declare let window: any;
declare let ethers: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  @ViewChild('metamask') metamaskBtn: ElementRef;

  provider;
  signer;
  dPoolsContract;

  accounts;
  selectedAccount;
  dPools: DPool[] = [];

  disableStartAppBtn = false;
  loading: boolean = false;
  jdValue = '';

  constructor(private cdr: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    if (typeof window.ethereum === 'undefined') {
      this.disableStartAppBtn = true;
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }

    let p1 = {
      dPoolName: 'Sample Stream',
      creator: this.selectedAccount,
      recipients: ['0x123456', '0x234567'],
      token: undefined,
      startTime: new Date().getTime(),
      stopTime: new Date(new Date().getDay() + 17).getTime(),
      status: 'new'
    } as DPool;
    this.dPools.push(p1);
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

}
