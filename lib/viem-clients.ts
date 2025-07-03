// /app/lib/viem-clients.ts
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts'; // CORRECTED: Imported from 'viem/accounts'
import { flowTestnet } from 'viem/chains';

// Make sure your .env file has these variables
if (!process.env.PRIVATE_KEY || !process.env.FLOW_TESTNET_RPC_URL) {
    throw new Error("Missing PRIVATE_KEY or FLOW_TESTNET_RPC_URL in .env file");
}

// 1. Create an Account from your private key
export const agentAccount = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

// 2. Create a Public Client for reading data from Flow
export const publicClient = createPublicClient({
    chain: flowTestnet,
    transport: http(process.env.FLOW_TESTNET_RPC_URL),
});

// 3. Create a Wallet Client for sending transactions from the agent's wallet
export const walletClient = createWalletClient({
    account: agentAccount,
    chain: flowTestnet,
    transport: http(process.env.FLOW_TESTNET_RPC_URL),
});