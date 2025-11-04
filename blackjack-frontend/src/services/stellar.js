import * as StellarSdk from "@stellar/stellar-sdk";
import { setAllowed, getAddress, signTransaction, getNetwork } from "@stellar/freighter-api";

export const CONFIG = {
  CONTRACT_ID: "CB2ASRGXFN4JUUOHGDTPG6KLESWXRCEEQRWO2G6XRUSL5BDH3QCTJ54Z",
  OWNER_ADDRESS: "GAFCV6LMCIPBXHV3OE4WIBO3TFDQS7YKUXJPOG7YBHZVWVIYN4EAJG36",
  NETWORK_PASSPHRASE: StellarSdk.Networks.TESTNET,
  RPC_URL: "https://soroban-testnet.stellar.org",
  HORIZON_URL: "https://horizon-testnet.stellar.org",
};

export class StellarService {
  constructor() {
    // ✅ Use SorobanServer for smart contract operations
    this.server = new StellarSdk.rpc.Server(CONFIG.RPC_URL);
  }

  // 🦊 Connect wallet (Freighter)
  async connectWallet() {
    await setAllowed();

    const network = await getNetwork();
    if (network.network !== "TESTNET") {
      throw new Error("Please switch to TESTNET in Freighter");
    }

    const { address } = await getAddress();
    console.log("Connected wallet:", address);
    return address;
  }

  // 💰 Get XLM balance via Horizon (useful for showing wallet balance)
  async getBalance(address) {
    const response = await fetch(`${CONFIG.HORIZON_URL}/accounts/${address}`);
    const accountData = await response.json();
    const xlmBalance = accountData.balances.find(b => b.asset_type === "native");
    return parseFloat(xlmBalance?.balance || 0);
  }

  // 🧱 Build and sign a Soroban transaction
  async buildAndSignTransaction(address, operation) {
    console.log("Building transaction for:", address);

    // ✅ Load account from Soroban RPC
    const account = await this.server.getAccount(address);

    // ✅ Build the transaction (use high fee for Soroban)
    let tx = new StellarSdk.TransactionBuilder(account, {
      fee: "10000000", // Soroban requires higher fee
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    console.log("Transaction built. Preparing via RPC...");

    // ✅ Prepare transaction (simulation step)
    // tx = await this.server.prepareTransaction(tx);

    // console.log("Transaction prepared.");

    // ✅ Convert to XDR and sign using Freighter
    const xdr = tx.toXDR();
    const signedXDR = await signTransaction(xdr, {
      network: "TESTNET",
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    });

    console.log("Transaction signed.");

    // ✅ Convert back to Transaction object
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      CONFIG.NETWORK_PASSPHRASE
    );

    return signedTx;
  }

  // 🚀 Send and confirm Soroban transaction
  async sendAndConfirmTransaction(transaction) {
    console.log("Submitting transaction...");

    // Send transaction to Soroban RPC
    const sendResponse = await this.server.sendTransaction(transaction);
    console.log("Send response:", sendResponse);

    let statusResponse = await this.server.getTransaction(sendResponse.hash);
    console.log("Waiting for confirmation...");

    // Poll until transaction completes
    while (statusResponse.status === "NOT_FOUND") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      statusResponse = await this.server.getTransaction(sendResponse.hash);
    }

    if (statusResponse.status !== "SUCCESS") {
      console.error("Transaction failed:", statusResponse);
      throw new Error("Transaction failed: " + statusResponse.status);
    }

    console.log("Transaction success:", statusResponse);
    return statusResponse;
  }
}
