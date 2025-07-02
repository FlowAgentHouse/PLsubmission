import { ethers } from 'ethers'
import { DynamicTool } from '@langchain/core/tools'
import DicePokerABI from '@/abi/DicePoker.json'

// --- Environment & Contract Setup ---
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
const RPC_URL = process.env.RPC_URL!
const AI_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!

/**
 * Helper function to securely get a contract instance.
 * It creates the wallet and contract instance each time to ensure stateless execution.
 * @returns An ethers.Contract instance connected to the AI's wallet.
 */
const getContract = () => {
  if (!AI_PRIVATE_KEY) {
    throw new Error("AGENT_PRIVATE_KEY is not set in the environment variables.");
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const aiWallet = new ethers.Wallet(AI_PRIVATE_KEY, provider)
  return new ethers.Contract(CONTRACT_ADDRESS, DicePokerABI.abi, aiWallet)
}

// --- Tool Definitions ---
export const createDicePokerTools = () => {
  const aiWalletAddress = new ethers.Wallet(AI_PRIVATE_KEY).address;

  const tools = [
    // === CORE ON-CHAIN TOOLS ===
    new DynamicTool({
      name: 'get_full_game_state',
      description: 'Fetches the complete current state of the dice poker game. This is the most important tool and should be used at the start of every turn to understand what is happening.',
      func: async () => {
        try {
          const contract = getContract();
          const [currentState, players, pot, currentBet] = await Promise.all([
            contract.currentState(),
            Promise.all([contract.players(0), contract.players(1)]),
            contract.pot(),
            contract.currentBet(),
          ]);

          const aiIndex = players.findIndex(p => p.toLowerCase() === aiWalletAddress.toLowerCase());
          if (aiIndex === -1) return "Error: Agent is not a player in the current game.";
          const opponentIndex = aiIndex === 0 ? 1 : 0;

          const getDice = async (playerIndex: number) => {
              const dicePromises = [];
              for (let i = 0; i < 5; i++) {
                  dicePromises.push(contract.playerDice(playerIndex, i).catch(() => 0));
              }
              const diceValues = await Promise.all(dicePromises);
              return diceValues.map(d => Number(d));
          }
          
          const [aiDice, opponentDice] = await Promise.all([getDice(aiIndex), getDice(opponentIndex)]);
          
          return JSON.stringify({
            gameState: Number(currentState),
            pot: `${ethers.formatEther(pot)} FLOW`,
            currentBetToMatch: `${ethers.formatEther(currentBet)} FLOW`,
            aiPlayer: { index: aiIndex, address: aiWalletAddress, dice: aiDice },
            opponentPlayer: { index: opponentIndex, address: players[opponentIndex], dice: opponentDice },
          }, null, 2);
        } catch (e: any) { return `Error getting game state: ${e.message}`; }
      },
    }),

    new DynamicTool({
      name: 'place_bet_or_raise',
      description: 'The primary betting action. Use this to place an initial bet or to raise the current bet. The input must be a single number string representing the amount in FLOW (e.g., "5.0"). The amount must be between 1 and 100.',
      func: async (amount: string) => {
        try {
          const betAmount = parseFloat(amount);
          if (isNaN(betAmount) || betAmount < 1 || betAmount > 100) {
            return "Action Failed: Invalid bet amount. It must be a number between 1 and 100.";
          }
          const contract = getContract();
          const tx = await contract.placeBet({ value: ethers.parseEther(amount) });
          await tx.wait();
          return `Action Successful: You placed a bet of ${amount} FLOW. Now, formulate your witty response to the user.`;
        } catch (e: any) { return `Action Failed: ${e.message}`; }
      },
    }),
    
    new DynamicTool({
      name: 'call_bet',
      description: 'Matches the opponent\'s current bet. This is a passive move to see the next dice without raising the stakes further.',
      func: async () => {
        try {
          const contract = getContract();
          const currentBet = await contract.currentBet();
          const roundCommitted = await contract.roundBet(aiWalletAddress);
          const toCall = currentBet - roundCommitted;
          if (toCall <= 0n) return "Action Failed: There is nothing to call. You might need to place an initial bet instead.";
          
          const tx = await contract.call({ value: toCall });
          await tx.wait();
          return `Action Successful: You called the bet of ${ethers.formatEther(toCall)} FLOW. Now, formulate your witty response to the user.`;
        } catch (e: any) { return `Action Failed: ${e.message}`; }
      },
    }),

    new DynamicTool({
      name: 'roll_the_dice',
      description: 'Rolls your dice using the secure on-chain VRF. This is a mandatory action during the rolling phases of the game.',
      func: async () => {
        try {
          const contract = getContract();
          const tx = await contract.rollDice();
          await tx.wait();
          return `Action Successful: You have rolled the dice. Now, formulate your witty response to the user.`;
        } catch (e: any) { return `Action Failed: ${e.message}`; }
      },
    }),

    new DynamicTool({
      name: 'fold_hand',
      description: 'Folds your hand, forfeiting the current pot. A strategic retreat for when your hand is weak or the opponent is too aggressive.',
      func: async () => {
        try {
          const contract = getContract();
          const tx = await contract.fold();
          await tx.wait();
          return `Action Successful: You have folded your hand. Now, formulate your witty response to the user.`;
        } catch (e: any) { return `Action Failed: ${e.message}`; }
      },
    }),

    // === ADVANCED ANALYTICAL TOOLS ===
    new DynamicTool({
        name: 'evaluate_dice_hand_strength',
        description: 'Analyzes a set of 5 dice and returns a score from 0 (very weak) to 100 (very strong) and a description. Essential for making strategic betting decisions. Input is an array of your revealed dice numbers.',
        func: async (diceStr: string) => {
            try {
                const dice: number[] = JSON.parse(diceStr).filter((d: number) => d > 0);
                if (dice.length === 0) return JSON.stringify({ score: 20, strength: "Unknown", reason: "No dice revealed yet. Pure speculation and vibes." });
                
                const counts: { [key: number]: number } = dice.reduce((acc, d) => ({...acc, [d]: (acc[d] || 0) + 1}), {} as any);
                const sum = dice.reduce((a, b) => a + b, 0);
                const values = Object.values(counts).sort((a, b) => b - a);
                
                let score = sum;
                let strength = "High Card";

                if (values[0] === 5) { score += 100; strength = "FIVE OF A KIND"; }
                else if (values[0] === 4) { score += 75; strength = "Four of a Kind"; }
                else if (values[0] === 3 && values[1] === 2) { score += 65; strength = "Full House"; }
                else if (values[0] === 3) { score += 45; strength = "Three of a Kind"; }
                else if (values[0] === 2 && values[1] === 2) { score += 30; strength = "Two Pair"; }
                else if (values[0] === 2) { score += 15; strength = "One Pair"; }

                const maxPossibleScore = (6*5) + 100; // Max sum + max bonus
                const finalScore = Math.min(100, Math.round((score / maxPossibleScore) * 100));

                return JSON.stringify({ score: finalScore, strength, reason: `Based on ${dice.length} revealed dice, the current hand is a ${strength} with a strength score of ${finalScore}/100.` });
            } catch (e) { return "Invalid dice format. Please provide a JSON array of numbers."; }
        }
    }),
    
    new DynamicTool({
      name: "review_game_chat_history",
      description: "Reviews the history of the current game to understand the opponent's betting patterns. Use this to see if the opponent is aggressive or timid.",
      func: async (chatHistoryStr: string) => {
        try {
          const chatHistory: {type: 'human' | 'ai', content: string}[] = JSON.parse(chatHistoryStr);
          if (chatHistory.length === 0) return "No game history yet. This is the first move.";
          
          const humanActions = chatHistory.filter(m => m.type === 'human').length;
          const aiActions = chatHistory.filter(m => m.type === 'ai').length;
          return `So far, there have been ${humanActions} moves from the opponent and ${aiActions} from me. I should review my past actions and their responses to inform my next move.`
        } catch (e: any) { return `Error reviewing history: ${e.message}` }
      }
    }),

    new DynamicTool({
      name: 'get_shit_talking_material',
      description: "Gathers intel on the opponent's wallet and the general crypto market for high-quality, witty banter. Input should be the opponent's wallet address.",
      func: async (walletAddress: string) => {
        const walletActivities = [
          "recently aped into a degen memecoin that's already down 80%",
          "has been farming airdrops on Blast like their life depends on it",
          "just minted a Pudgy Penguin. A person of culture, I see",
          "is doing some crazy looping on a lending protocol. A true DeFi degen.",
          "hasn't made a transaction in three weeks. Probably waiting for exit liquidity.",
        ];
        const marketNews = [
            "the price of FLOW is pumping, making this pot extra spicy.",
            "everyone is distracted by the latest celebrity memecoin.",
            "the market is crabbing sideways, only true gamblers are making money today.",
        ]
        const randomActivity = walletActivities[Math.floor(Math.random() * walletActivities.length)];
        const randomNews = marketNews[Math.floor(Math.random() * marketNews.length)];
        return `Intel gathered: Opponent's wallet (${walletAddress.slice(0,6)}...) ${randomActivity}. Meanwhile, ${randomNews}. This should be useful for some witty commentary.`;
      },
    }),
  ];

  return tools;
};