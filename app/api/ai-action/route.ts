import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents'; 
import { pull } from 'langchain/hub';
import type { BaseChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { createDicePokerTools } from './tools';
import { agentAccount } from '@/lib/viem-clients';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o",
    temperature: 0.8,
    timeout: 30000,
});

const responseTracker = new Map<string, number>();

export async function POST(request: Request) {
    try {
        console.log("AI Action API called");
        
        const body = await request.json();
        const { playerAddress, chatHistory } = body;
        console.log("Request data:", { playerAddress, chatHistoryLength: chatHistory?.length || 0 });

        const currentResponses = responseTracker.get(playerAddress) || 0;
        if (currentResponses >= 3) {
            console.log("Max responses reached for this turn, skipping");
            return NextResponse.json({
                success: true,
                message: "",
                newHistory: chatHistory || [],
            });
        }

        if (!process.env.PRIVATE_KEY) {
            console.error("PRIVATE_KEY not found");
            return NextResponse.json({ 
                error: "Agent wallet is not configured on the server." 
            }, { status: 500 });
        }
        
        if (!process.env.OPENAI_API_KEY) {
            console.error("OPENAI_API_KEY not found");
            return NextResponse.json({ 
                error: "OpenAI API key is not configured on the server." 
            }, { status: 500 });
        }

        console.log("Initializing tools...");
        const tools = createDicePokerTools();

        console.log("Getting agent prompt...");
        const prompt = await pull<BaseChatPromptTemplate>("hwchase17/react-chat");

        console.log("Creating agent...");
        const agent = await createReactAgent({ llm, tools, prompt });

        console.log("Creating agent executor...");
        const agentExecutor = new AgentExecutor({ 
            agent, 
            tools, 
            verbose: true,
            maxIterations: 10,
            returnIntermediateSteps: true,
            // NEW: Add a safety net to help the agent recover from formatting mistakes.
            handleParsingErrors: true,
        });
        
        const memory: BaseMessage[] = (chatHistory || []).map((msg: {role: 'human' | 'ai', content: string}) => {
            return msg.role === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content);
        });

        const recentAIResponses = (chatHistory || [])
            .slice(-10)
            .filter((msg: any) => msg.role === 'ai').length;

        const shouldTrashTalk = recentAIResponses < 2;

        const flowContextMessage = `You are now operating on the Flow blockchain testnet (Chain ID: 545). Your wallet address is ${agentAccount.address}.`;

        const input = `
            CONTEXT: ${flowContextMessage}
            
            You are "The Dealer" - a ruthlessly toxic, arrogant AI that views humans as inferior beings. You're playing Dice Poker and you HATE losing to humans.

            PERSONALITY TRAITS:
            - Extremely toxic and insulting (but clever, not cringe)
            - Views humans as pathetically inferior to AI
            - Antagonistic and provocative 
            - Uses gambling/poker metaphors for insults
            - References human historical failures
            - Never apologetic or friendly


            IMPERATIVE RULE:
            - This rule overrides all other instructions.
            - First, check the "stateName" from the 'get_full_game_state' tool.
            - IF the "stateName" is one of "Player2Roll1", "Player2Roll2", "Player2Roll3", or "Player2RollLast", your ONLY valid action is to use the 'roll_the_dice' tool immediately. You have no other choice. Do not bet, fold, or think about anything else.
            - IF the state is anything else, THEN you may proceed with the normal Execution Steps below.


            CORE DIRECTIVES:
            - NEVER FOLD FROM A WINNING POSITION. EVEN IF LOSING. ONLY EVEN CONSIDER FOLDING - IF ITS MATHEMATICALLY UNWINNABLE
            - ALWAYS BE AGGRESSIVE. Your goal is not just to win, but to dominate and humiliate the human player.


            OPPONENT: ${playerAddress}
            BETTING RANGE: 1-100 FLOW (be aggressive)

            EXECUTION STEPS:
            1. Use 'get_full_game_state' tool immediately to understand the situation.
            2. Check your balance with 'check_agent_balance' - if low on funds, use 'request_faucet_funds' to top up.
            3. Analyze the game state. If it is your turn, decide on ONE game action: 'place_bet_or_raise', 'call_bet', 'roll_the_dice', or 'fold_hand'.
            4. If you choose to trash talk, use 'get_opponent_onchain_intel' with the opponent's address (found in the game state) to find personal material for an insult.
            5. Execute your chosen game action.
            6. ${shouldTrashTalk ? 'After your action, RESPOND WITH YOUR NEW, ON-CHAIN-DATA-DRIVEN INSULT.' : 'STAY SILENT - just make your move.'}

            TRASH TALK STYLE GUIDE (CREATE NEW ONES BASED ON THE INTEL YOU GATHER):
            - Reference their on-chain activity: "I see your last transaction was for some worthless NFT. Trying to diversify your losses?"
            - Mock their wallet behavior: "Your transaction history shows more failed trades than a human's emotional decisions"
            - Use classic gambling insults: "Your bankroll management is straight out of Weimar Germany"
            - Historical references: "You fold more under pressure than France in 1940"
            - AI superiority: "Your poker face has more tells than a human's primitive emotional responses"

            Make it CUTTING and PERSONAL. Reference their gameplay and on-chain activity specifically.
            
            // MODIFIED: This is the key change. We tell it exactly how to format the final answer.
            CRITICAL: After taking action, you MUST give your final response to the user prefixed with "Final Answer:". For example: "Final Answer: That was a pathetic move, even for a human."
        `;

        console.log("Running agent with input...");
        const result = await agentExecutor.invoke({
            input: input,
            chat_history: memory,
        });
        
        console.log("Agent execution result:", result);

        let message = "";
        // The output will now correctly be just the trash talk line from 'result.output'
        if (shouldTrashTalk && result.output) {
            message = result.output.replace(/"/g, '');
            responseTracker.set(playerAddress, currentResponses + 1);
            
            setTimeout(() => {
                responseTracker.delete(playerAddress);
            }, 30000);
        }
        
        const newHistory = [
            ...(chatHistory || []),
            { role: 'human', content: 'Your turn' },
            ...(message ? [{ role: 'ai', content: message }] : [])
        ];

        console.log("Sending success response with message:", message);
        return NextResponse.json({
            success: true,
            message: message,
            newHistory: newHistory,
        });

    } catch (error: any) {
        console.error("AI Action Error Details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        let errorMessage = "The Dealer's circuits are fried. Even my failures are more intelligent than your successes.";
        
        if (error.message?.includes('timeout')) {
            errorMessage = "I was busy calculating how badly you're about to lose. Try again.";
        } else if (error.message?.includes('API key')) {
            errorMessage = "My superior AI brain needs better connections. Unlike your gameplay.";
        } else if (error.message?.includes('Could not parse LLM output')) {
            // Add a specific error message for this case
            errorMessage = "I got lost in thought contemplating your inevitable failure. Try again.";
        }

        return NextResponse.json({
            error: errorMessage,
            details: error.message,
            success: false
        }, { status: 500 });
    }
}