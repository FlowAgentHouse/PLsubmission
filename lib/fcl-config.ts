import { config } from "@onflow/fcl";

config({
  // name of your application
  "app.detail.title": "Flow Dice Poker",
  // random URL to a logo for your application
  "app.detail.icon": "https://cdn.sanity.io/images/kts928pd/production/fb3dd18e5938bd78cca39c1a4df02eba65f424df-731x731.png",
  
  // Flow Access Node
  "accessNode.api": "https://rest-testnet.onflow.org",
  
  // FCL Wallet Discovery endpoint
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  
  "fcl.account.proof.vsn": "2.0.0"
});