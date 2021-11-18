## Describtion to avoiding certain common attacks

### Using Specific Compiler Pragma
I am using the stable pragma version 0.8.0.

### Proper Use of Require
I use many require statements and many are combined in modifiers.
They are used to validate all user inputs to create a valid DPool.

### Use Modifiers Only for Validation
All my modifiers are only used for validations only.

### Proper use of .call and .delegateCall
I am using .call to transfer ETH to and from the contract.
To handle ERC20 Tokens I used Openzeppelin's interface for that.

### Re-entrancy
The reentrancy modifier from Openzeppelin is also used to not allow immediate back calls.

### Tx.Origin Authentication
To halt and resume functions of contract I use the Ownable implementation of Openzeppelin.

Haven't stored any unencrypted data in contract: SWC-136
Reentrancy check: SWC-107
