### blockchain-developer-bootcamp-final-project

## Decentralized Pools
##### My eth address for the nft certificate:  0x2D80fD6fe6a3D38A2b0F86D2eE990bD24521BD96

Stream either Ether or any other ERC20 Tokens to selected recipients of your choice. It is fairly easy and quick to create a DPool by giving a name, start and end date, amount that you want to distribute and the receptors. The distribution starts when the block timestamp reaches the start date of the DPool. Receivers can watch their accounts grow second by second and withdraw the available amount immediatly.

One usecase maybe to distribute crypto to DAOs via DPools for selected projects in a specific time.


------------
### Visual testing
1. Access website on https://dpools.subdomain.com
*Contract is deployed on Rinkeby 0x...*
2. Login to MetaMask and press the button *Start Applikation*.
Make sure MetaMask is running on the local network on port 7545.<br/>
![p1](https://user-images.githubusercontent.com/8811485/142629714-453582d5-834a-44f8-b025-c0b6feed6e31.jpg)

3. After that you will see the main page.
![p2](https://user-images.githubusercontent.com/8811485/142629735-a346c7ca-fa13-4992-8987-62e524c36b52.jpg)

4. You can follow the next steps in my screencast here:
youtube

------------

### Prerequisites
 - Angular CLI: 12.2.12
 - Node: 12.18.2
 - Package Manager: npm 6.8.0
 - Ganache CLI v6.12.2 (ganache-core: 2.13.2)

### Setup
- #### Frontend
  - Navigate to frontend-ng folder in '*blockchain-developer-bootcamp-final-project*:'<br/>
    `cd frontend-ng`
 
  - Install all Angular project dependencies:<br/>
    `npm install --save`

  - And spin up frontend:<br/>
    `ng serve --open`

- #### Ganache
  - Go to the main folder '*blockchain-developer-bootcamp-final-project*:'<br/>
    `cd blockchain-developer-bootcamp-final-project`

  - Run Ganache on port 7545:<br/>
    `ganache-cli -p 7545`

  - Build the contract and move the *json* file to frontend-ng:<br/>
    `npm run build`

    --  If that does not work, you have to build and move json file on your own:<br/>
     --- `truffle build`  
     and           
     --- `copy build\\contracts\\DecentralizedPools.json frontend-ng\\src\\contract` <br/>
     yeah I had to develop on windows :/
     
  - Deploy contract locally:<br/>
    `npm run deploy`

   **Thats it.**

  - For contract Unit tests:<br/>
    `npm run test`
Note: You need to have a freshly spun up blockchain because the unit tests change block timestamp.

  - To deploy on Rinkeby:<br/>
    `npm run deploy-rinkeby`

------------
### Things to improve

If I had more time, I could finish the whole project so that also DPools containing Tokens could have been created.
