import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DpoolService {

  constructor() { }

  copyToCB(account) {
    this.show();
    navigator.clipboard.writeText(account);
  }

  show() {
    const x = document.getElementById("snackbar");
    x.className = "show";
    // After 3 seconds, remove the show class from DIV
    setTimeout(function () { x.className = x.className.replace("show", ""); }, 4000);
  }
}
