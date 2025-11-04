import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarService, CONFIG } from './stellar';
import { signTransaction } from '@stellar/freighter-api';

export class ContractService {
  constructor() {
    this.stellar = new StellarService();
    this.contract = new StellarSdk.Contract(CONFIG.CONTRACT_ID);
    this.tokenContract = new StellarSdk.Contract(CONFIG.TOKEN_CONTRACT_ID);
  }

  async betAndDeal(playerAddress, betAmount) {
    try {
      const betInStroops = BigInt(betAmount * 10000000);

      // ✅ STEP 1: Approve token transfer first
      console.log('Approving token transfer...');
      const approveOp = this.tokenContract.call(
        'approve',
        StellarSdk.Address.fromString(playerAddress).toScVal(),
        StellarSdk.Address.fromString(CONFIG.CONTRACT_ID).toScVal(),
        StellarSdk.nativeToScVal(betInStroops, { type: 'i128' }),
        StellarSdk.nativeToScVal(0, { type: 'u32' }) // expiration_ledger = 0
      );

      const approvedTx = await this.stellar.buildAndSignTransaction(playerAddress, approveOp);
      await this.stellar.sendAndConfirmTransaction(approvedTx);
      console.log('Token approved!');

      // ✅ STEP 2: Now call bet_and_deal
      console.log('Placing bet...');
      const operation = this.contract.call(
        'bet_and_deal',
        StellarSdk.Address.fromString(playerAddress).toScVal(),
        StellarSdk.nativeToScVal(betInStroops, { type: 'i128' })
      );

      const signedTx = await this.stellar.buildAndSignTransaction(playerAddress, operation);
      const response = await this.stellar.sendAndConfirmTransaction(signedTx);

      const result = StellarSdk.scValToNative(response.returnValue);
      return {
        playerHand: result.player_hand.map(c => ({ value: c.value, suit: c.suit })),
        dealerHand: result.dealer_hand.map(c => ({ value: c.value, suit: c.suit })),
      };
    } catch (err) {
      console.error('❌ Failed to place bet:', err);
      throw err;
    }
  }


  // ✋ Player chooses "Hit"
  async hit(playerAddress) {
    try {
      const operation = this.contract.call('hit');
      const signedTx = await this.stellar.buildAndSignTransaction(playerAddress, operation);
      const response = await this.stellar.sendAndConfirmTransaction(signedTx);

      const result = StellarSdk.scValToNative(response.returnValue);
      return {
        playerHand: result.player_hand.map(c => ({ value: c.value, suit: c.suit })),
        dealerHand: result.dealer_hand.map(c => ({ value: c.value, suit: c.suit })),
        phase: result.phase,
      };
    } catch (err) {
      console.error('❌ Failed to hit:', err);
      throw err;
    }
  }

  // 🧍 Player chooses "Stand"
  async stand(playerAddress) {
    try {
      const operation = this.contract.call('stand');
      const signedTx = await this.stellar.buildAndSignTransaction(playerAddress, operation);
      const response = await this.stellar.sendAndConfirmTransaction(signedTx);

      const result = StellarSdk.scValToNative(response.returnValue);
      return {
        playerHand: result.player_hand.map(c => ({ value: c.value, suit: c.suit })),
        dealerHand: result.dealer_hand.map(c => ({ value: c.value, suit: c.suit })),
        phase: result.phase,
      };
    } catch (err) {
      console.error('❌ Failed to stand:', err);
      throw err;
    }
  }

  // 💰 Fund the contract
  async fundContract(fromAddress, amount) {
    try {
      const amountInStroops = BigInt(amount * 10000000n);

      const operation = this.contract.call(
        'fund_contract',
        StellarSdk.Address.fromString(fromAddress).toScVal(),
        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' })
      );

      const signedTx = await this.stellar.buildAndSignTransaction(fromAddress, operation);
      await this.stellar.sendAndConfirmTransaction(signedTx);
    } catch (err) {
      console.error('❌ Failed to fund contract:', err);
      throw err;
    }
  }

  // 🏦 Claim winnings
  async claimFunds(ownerAddress, amount) {
    try {
      const amountInStroops = BigInt(amount * 10000000n);

      const operation = this.contract.call(
        'claim_funds',
        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' })
      );

      const signedTx = await this.stellar.buildAndSignTransaction(ownerAddress, operation);
      await this.stellar.sendAndConfirmTransaction(signedTx);
    } catch (err) {
      console.error('❌ Failed to claim funds:', err);
      throw err;
    }
  }

  // 🧾 Optional — query contract balance (if available)
  async getContractBalance() {
    try {
      // Replace with actual contract call if you’ve defined it
      return 0;
    } catch (err) {
      console.error('❌ Failed to fetch balance:', err);
      return 0;
    }
  }
}
