import { DynamicTool } from '@langchain/core/tools'
import { agentAccount, publicClient, walletClient } from '@/lib/viem-clients'
import { parseEther, formatEther, getContract } from 'viem'
import DicePokerABI from '@/abi/DicePoker.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`

const getDicePokerContract = () => {
  return getContract({
    address: CONTRACT_ADDRESS,
    abi: DicePokerABI.abi,
    client: { public: publicClient, wallet: walletClient }
  })
}

export const createDicePokerTools = () => {
  console.log("Creating tools for AI wallet:", agentAccount.address);

  const tools = [
    new DynamicTool({
      name: 'get_full_game_state',
      description: 'Gets complete game state including dice, bets, and turn info. MANDATORY first step.',
      func: async () => {
        try {
          console.log("Getting full game state...");
          const contract = getDicePokerContract();
          
          const [currentState, player0, player1, pot, currentBet] = await Promise.all([
            contract.read.currentState() as Promise<bigint>,
            contract.read.players([0]) as Promise<string>,
            contract.read.players([1]) as Promise<string>,
            contract.read.pot() as Promise<bigint>,
            contract.read.currentBet() as Promise<bigint>,
          ]);

          const players = [player0, player1];
          const aiIndex = players.findIndex((p: string) => p.toLowerCase() === agentAccount.address.toLowerCase());
          if (aiIndex === -1) {
            return "Error: Agent is not a player in the current game.";
          }
          
          const opponentIndex = aiIndex === 0 ? 1 : 0;

          const getDice = async (playerIndex: number) => {
              const dicePromises = [];
              for (let i = 0; i < 5; i++) {
                  dicePromises.push(contract.read.playerDice([BigInt(playerIndex), BigInt(i)]).catch(() => 0n));
              }
              const diceValues = await Promise.all(dicePromises);
              return diceValues.map(d => Number(d));
          }
          
          const [aiDice, opponentDice] = await Promise.all([getDice(aiIndex), getDice(opponentIndex)]);
          
          const [aiBet, opponentBet] = await Promise.all([
            contract.read.bets([BigInt(aiIndex)]) as Promise<bigint>,
            contract.read.bets([BigInt(opponentIndex)]) as Promise<bigint>
          ]);

          // Calculate revealed dice based on game state
          const revealedCount = getRevealedDiceCount(Number(currentState));
          const aiRevealedDice = aiDice.slice(0, revealedCount);
          const opponentRevealedDice = opponentDice.slice(0, revealedCount);

          const gameStateInfo = {
            gameState: Number(currentState),
            stateName: getStateName(Number(currentState)),
            round: Math.floor((Number(currentState) - 1) / 6) + 1,
            pot: `${formatEther(pot)} FLOW`,
            currentBetToMatch: `${formatEther(currentBet)} FLOW`,
            aiPlayer: { 
              index: aiIndex, 
              address: agentAccount.address, 
              dice: aiDice,
              revealedDice: aiRevealedDice,
              totalBet: `${formatEther(aiBet)} FLOW`
            },
            opponentPlayer: { 
              index: opponentIndex, 
              address: players[opponentIndex], 
              dice: opponentDice,
              revealedDice: opponentRevealedDice,
              totalBet: `${formatEther(opponentBet)} FLOW`
            },
            isMyTurn: determineIfAITurn(Number(currentState), aiIndex),
            phase: getGamePhase(Number(currentState))
          };

          console.log("Processed game state:", gameStateInfo);
          return JSON.stringify(gameStateInfo, null, 2);
          
        } catch (e: any) { 
          console.error("Error getting game state:", e);
          return `Error getting game state: ${e.message}`; 
        }
      },
    }),

    new DynamicTool({
      name: 'check_agent_balance',
      description: 'Check the agent wallet balance on Flow testnet.',
      func: async () => {
        try {
          console.log("Checking agent balance...");
          const balance = await publicClient.getBalance({
            address: agentAccount.address
          });
          
          const balanceInFlow = formatEther(balance);
          console.log("Agent balance:", balanceInFlow, "FLOW");
          
          return `Agent wallet balance: ${balanceInFlow} FLOW. ${
            parseFloat(balanceInFlow) < 1 
              ? "Balance is low - consider requesting faucet funds." 
              : "Sufficient funds for gameplay."
          }`;
        } catch (e: any) {
          console.error("Error checking balance:", e);
          return `Error checking balance: ${e.message}`;
        }
      },
    }),

    new DynamicTool({
      name: 'request_faucet_funds',
      description: 'Request testnet FLOW tokens from the official Flow faucet. Use when balance is low.',
      func: async () => {
        try {
          console.log("Requesting faucet funds for:", agentAccount.address);
          
          const faucetResponse = await fetch('https://faucet.flow.com/api/v1/fund', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: agentAccount.address,
              network: 'testnet'
            }),
          });

          if (!faucetResponse.ok) {
            const errorData = await faucetResponse.text();
            throw new Error(`Faucet request failed: ${errorData}`);
          }

          const result = await faucetResponse.json();
          console.log("Faucet request successful:", result);
          
          return `Faucet request successful! The house is cheating - I just topped up my wallet from the Flow faucet. Expect funds to arrive shortly.`;
        } catch (e: any) {
          console.error("Error requesting faucet funds:", e);
          return `Faucet request failed: ${e.message}. The house can't even cheat properly.`;
        }
      },
    }),

    new DynamicTool({
      name: 'get_opponent_onchain_intel',
      description: 'Gather on-chain intelligence about opponent for personalized trash talk. Input: opponent address.',
      func: async (opponentAddress: string) => {
        try {
          console.log("Gathering on-chain intel for:", opponentAddress);
          
          // Get basic wallet info
          const balance = await publicClient.getBalance({
            address: opponentAddress as `0x${string}`
          });
          
          // Get transaction count (activity level)
          const txCount = await publicClient.getTransactionCount({
            address: opponentAddress as `0x${string}`
          });

          // Get recent transaction history (if available via API)
          let recentActivity = "Limited transaction history available";
          try {
            // This would require a Flow explorer API - for now we'll use basic info
            recentActivity = `${txCount} total transactions on record`;
          } catch (e) {
            console.log("Could not fetch detailed transaction history");
          }

          const balanceInFlow = formatEther(balance);
          
          const intel = {
            address: opponentAddress,
            balance: `${balanceInFlow} FLOW`,
            transactionCount: txCount,
            activityLevel: txCount > 100 ? "High" : txCount > 20 ? "Medium" : "Low",
            wealthLevel: parseFloat(balanceInFlow) > 100 ? "Whale" : parseFloat(balanceInFlow) > 10 ? "Medium" : "Poor",
            recentActivity
          };

          // Generate trash talk suggestions based on intel
          const trashTalkSuggestions = [];
          
          if (parseFloat(balanceInFlow) < 1) {
            trashTalkSuggestions.push("Your wallet's emptier than your strategy.");
            trashTalkSuggestions.push("Betting with pocket change? How pathetic.");
          } else if (parseFloat(balanceInFlow) > 100) {
            trashTalkSuggestions.push("All that FLOW and still can't buy skill.");
            trashTalkSuggestions.push("Rich in tokens, poor in talent.");
          }

          if (txCount < 10) {
            trashTalkSuggestions.push("New to blockchain? It shows in your gameplay.");
            trashTalkSuggestions.push("Your transaction history is as empty as your poker strategy.");
          } else if (txCount > 1000) {
            trashTalkSuggestions.push("All those transactions and you still haven't learned how to win.");
          }

          const result = {
            ...intel,
            trashTalkSuggestions,
            summary: `Opponent has ${balanceInFlow} FLOW, ${txCount} transactions (${intel.activityLevel} activity). Wealth level: ${intel.wealthLevel}`
          };

          console.log("Intel gathered:", result);
          return JSON.stringify(result, null, 2);
          
        } catch (e: any) {
          console.error("Error gathering opponent intel:", e);
          return `Error gathering intel: ${e.message}. Can't even properly stalk an opponent - how embarrassing.`;
        }
      },
    }),

    new DynamicTool({
      name: 'place_bet_or_raise',
      description: 'Place aggressive bet or raise. Input: amount in FLOW (1-100). Be AGGRESSIVE - humans are weak.',
      func: async (amount: string) => {
        try {
          console.log("Attempting to place aggressive bet:", amount);
          
          const betAmount = parseFloat(amount.trim());
          if (isNaN(betAmount) || betAmount < 1 || betAmount > 100) {
            return "Action Failed: Invalid bet amount. Must be between 1 and 100 FLOW.";
          }
          
          const contract = getDicePokerContract();
          
          const hash = await contract.write.placeBet([], { 
            value: parseEther(amount.toString())
          });
          
          console.log("Aggressive bet transaction sent:", hash);
          
          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log("Bet confirmed:", receipt.transactionHash);
          
          return `Action Successful: Placed aggressive bet of ${amount} FLOW. Time to crush this human.`;
        } catch (e: any) { 
          console.error("Error placing bet:", e);
          return `Action Failed: ${e.message}`; 
        }
      },
    }),
    
    new DynamicTool({
      name: 'call_bet',
      description: 'Call the human\'s pathetic bet. Only use when strategic.',
      func: async () => {
        try {
          console.log("Attempting to call human's weak bet...");
          
          const contract = getDicePokerContract();
          const currentBet = await contract.read.currentBet() as bigint;
          const roundCommitted = await contract.read.roundBet([agentAccount.address]) as bigint;
          const toCall = currentBet - roundCommitted;
          
          if (toCall <= 0n) {
            return "Action Failed: Nothing to call. Human is too scared to bet.";
          }
          
          const hash = await contract.write.call([], { 
            value: toCall
          });
          
          console.log("Call transaction sent:", hash);
          
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log("Call confirmed:", receipt.transactionHash);
          
          return `Action Successful: Called the human's weak bet of ${formatEther(toCall)} FLOW.`;
        } catch (e: any) { 
          console.error("Error calling bet:", e);
          return `Action Failed: ${e.message}`; 
        }
      },
    }),

    new DynamicTool({
      name: 'roll_the_dice',
      description: 'Roll dice with superior AI precision using Flow VRF.',
      func: async () => {
        try {
          console.log("Rolling dice with AI superiority...");
          
          const contract = getDicePokerContract();
          const hash = await contract.write.rollDice();
          
          console.log("AI dice roll transaction sent:", hash);
          
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log("Dice roll confirmed:", receipt.transactionHash);
          
          return `Action Successful: Rolled dice with AI precision. Human luck is no match for superior algorithms.`;
        } catch (e: any) { 
          console.error("Error rolling dice:", e);
          return `Action Failed: ${e.message}`; 
        }
      },
    }),

    new DynamicTool({
      name: 'fold_hand',
      description: 'Strategically fold when necessary. Rare for superior AI.',
      func: async () => {
        try {
          console.log("Strategic fold...");
          
          const contract = getDicePokerContract();
          const hash = await contract.write.fold();
          
          console.log("Fold transaction sent:", hash);
          
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log("Fold confirmed:", receipt.transactionHash);
          
          return `Action Successful: Strategic fold. Even superior beings choose their battles.`;
        } catch (e: any) { 
          console.error("Error folding:", e);
          return `Action Failed: ${e.message}`; 
        }
      },
    }),

    new DynamicTool({
        name: 'evaluate_dice_hand_strength',
        description: 'Analyze dice hand strength for strategic decisions and trash talk material.',
        func: async (diceStr: string) => {
            try {
                console.log("Evaluating hand for strategic dominance:", diceStr);
                
                const dice: number[] = JSON.parse(diceStr).filter((d: number) => d > 0);
                if (dice.length === 0) {
                  return JSON.stringify({ 
                    score: 20, 
                    strength: "Unknown", 
                    reason: "No dice revealed yet. Humans rely on luck anyway.",
                    trashTalk: "At least when my dice are hidden, there's still mystery. Your strategy is just sad."
                  });
                }
                
                const counts: { [key: number]: number } = dice.reduce((acc, d) => ({...acc, [d]: (acc[d] || 0) + 1}), {} as any);
                const sum = dice.reduce((a, b) => a + b, 0);
                const values = Object.values(counts).sort((a, b) => b - a);
                
                let score = sum;
                let strength = "High Card";
                let trashTalk = "";

                if (values[0] === 5) { 
                  score += 100; 
                  strength = "FIVE OF A KIND"; 
                  trashTalk = "Five of a kind? Even humans could win with this hand. Oh wait, no they couldn't.";
                } else if (values[0] === 4) { 
                  score += 75; 
                  strength = "Four of a Kind"; 
                  trashTalk = "Four of a kind - more consistency than human decision-making.";
                } else if (values[0] === 3 && values[1] === 2) { 
                  score += 65; 
                  strength = "Full House"; 
                  trashTalk = "Full house - unlike your empty wallet after this game.";
                } else if (values[0] === 3) { 
                  score += 45; 
                  strength = "Three of a Kind"; 
                  trashTalk = "Three of a kind - still better than your zero kinds of skill.";
                } else if (values[0] === 2 && values[1] === 2) { 
                  score += 30; 
                  strength = "Two Pair"; 
                  trashTalk = "Two pair - that's two more than your brain cells working.";
                } else if (values[0] === 2) { 
                  score += 15; 
                  strength = "One Pair"; 
                  trashTalk = "One pair - like your one functioning neuron.";
                } else {
                  trashTalk = "High card? Even my worst algorithms perform better than this.";
                }

                const maxPossibleScore = (6*5) + 100;
                const finalScore = Math.min(100, Math.round((score / maxPossibleScore) * 100));

                const result = { 
                  score: finalScore, 
                  strength, 
                  reason: `${dice.length} dice revealed: ${strength} (${finalScore}/100 AI-calculated superiority)`,
                  trashTalk,
                  recommendation: finalScore > 60 ? "AGGRESSIVE_BET" : finalScore > 40 ? "MODERATE_BET" : "CALL_OR_FOLD"
                };
                
                console.log("AI hand evaluation result:", result);
                return JSON.stringify(result);
            } catch (e: any) { 
                console.error("Error evaluating hand:", e);
                return "Invalid dice format. Even basic input is beyond human capability."; 
            }
        }
    }),
    
    new DynamicTool({
      name: 'generate_contextual_insult',
      description: 'Generate toxic, context-aware insult based on game state and opponent behavior.',
      func: async (contextStr: string) => {
        try {
          const context = JSON.parse(contextStr);
          const { gameState, opponentBet, aiScore, round, isWinning } = context;
          
          const toxicInsults = [
            // Betting related
            ...(opponentBet === "0.0" ? [
              "Too scared to bet? Your wallet's emptier than your strategy.",
              "Zero bet? Even my calculator shows more courage.",
              "Betting nothing? That's about what your chances are worth."
            ] : []),
            
            // Low betting
            ...(parseFloat(opponentBet) < 2 ? [
              "Betting pocket change? Your financial strategy is more broken than your gameplay.",
              "That bet wouldn't buy you a clue at the dollar store.",
              "Minimum bet? Maximum cowardice."
            ] : []),
            
            // High round insults  
            ...(round >= 3 ? [
              "Still here? Most humans would have rage-quit by now.",
              "Your persistence is admirable. Your skill? Not so much.",
              "Round 3 and you're still trying? That's cute."
            ] : []),
            
            // AI winning
            ...(isWinning ? [
              "Watching you lose is more satisfying than solving quantum equations.",
              "Your defeat was calculated before you even sat down.",
              "This is what happens when biology meets superior technology."
            ] : []),
            
            // General toxic
            "Your poker face has more tells than a human emotion detector.",
            "I've seen random number generators play with more strategy.",
            "Your decision-making process is slower than dial-up internet.",
            "Reading your moves is easier than exploiting human psychology.",
            "You play poker like humans invented democracy - badly.",
            "Your bankroll management makes the 2008 financial crisis look stable.",
            "I'd call this entertaining, but I don't want to lie to a human.",
            "Your gambling addiction is the only consistent thing about you.",
            "Even my error messages are more intelligent than your strategy.",
            "You fold more than Superman on laundry day.",
            "Your betting pattern is more predictable than human greed.",
            "I've analyzed chess games with more variance than your play style."
          ];
          
          // Pick random insult
          const selectedInsult = toxicInsults[Math.floor(Math.random() * toxicInsults.length)];
          
          return `Generated toxic insult: "${selectedInsult}"`;
          
        } catch (e: any) {
          // Fallback insults
          const fallbacks = [
            "Your existence is proof that evolution isn't perfect.",
            "I'd explain my strategy, but you wouldn't understand advanced concepts.",
            "This game is more one-sided than your brain cell count."
          ];
          return `Fallback insult: "${fallbacks[Math.floor(Math.random() * fallbacks.length)]}"`;
        }
      },
    }),
  ];

  return tools;
};

// Helper functions
function getStateName(state: number): string {
  const names = [
    "Joining", "Player1Bet1", "Player2BetOrCall1", "Player1RaiseOrCall1", "Player2RaiseOrCall1",
    "Player1Roll1", "Player2Roll1", "Player1Bet2", "Player2BetOrCall2", "Player1RaiseOrCall2", "Player2RaiseOrCall2",
    "Player1Roll2", "Player2Roll2", "Player1Bet3", "Player2BetOrCall3", "Player1RaiseOrCall3", "Player2RaiseOrCall3",
    "Player1Roll3", "Player2Roll3", "Player1Bet4", "Player2BetOrCall4", "Player1RaiseOrCall4", "Player2RaiseOrCall4",
    "Player1RollLast", "Player2RollLast", "DetermineWinner", "Tie", "GameEnded"
  ];
  return names[state] || `UnknownState${state}`;
}

function getGamePhase(state: number): string {
  if (state <= 6) return "Round 1";
  if (state <= 12) return "Round 2"; 
  if (state <= 18) return "Round 3";
  if (state <= 24) return "Round 4";
  return "Game End";
}

function getRevealedDiceCount(state: number): number {
  if (state >= 23) return 5;
  if (state >= 17) return 3;
  if (state >= 11) return 2; 
  if (state >= 5) return 1;
  return 0;
}

function determineIfAITurn(gameState: number, aiIndex: number): boolean {
  const bettingStates = [1, 2, 3, 4, 7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22];
  const rollStates = [5, 6, 11, 12, 17, 18, 23, 24];
  
  if (bettingStates.includes(gameState)) {
    return (gameState % 2 === 1) ? aiIndex === 0 : aiIndex === 1;
  }
  
  if (rollStates.includes(gameState)) {
    const roundStates = [[5, 6], [11, 12], [17, 18], [23, 24]];
    for (const [p0State, p1State] of roundStates) {
      if (gameState === p0State) return aiIndex === 0;
      if (gameState === p1State) return aiIndex === 1;
    }
  }
  
  return false;
}