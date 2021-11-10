export class DPool {
    dPoolId: string;
    dPoolName: string;
    creator: string;
    recipients: string[];
    deposit: number;
    depositDevaluated: number;
    remainingBalance: number;
    remainingBalanceDevaluated: number;
    token: string;
    startTime: number;
    stopTime: number;
    type: string;
}

