// /app/api/ai-action/route.ts
import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import type { BaseChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { createDicePokerTools } from './tools';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o",
    temperature: 0.8, // Higher temperature for more creative trash talk
    timeout: 30000,
});

// Track responses per session to limit spam
const responseTracker = new Map<string, number>();

export async function POST(request: Request) {
    try {
        console.log("AI Action API called");
        
        const body = await request.json();
        const { playerAddress, chatHistory } = body;
        console.log("Request data:", { playerAddress, chatHistoryLength: chatHistory?.length || 0 });

        // Track responses for this player
        const currentResponses = responseTracker.get(playerAddress) || 0;
        if (currentResponses >= 3) {
            console.log("Max responses reached for this turn, skipping");
            return NextResponse.json({
                success: true,
                message: "", // Silent turn - just make the move
                newHistory: chatHistory || [],
            });
        }

        if (!process.env.AGENT_PRIVATE_KEY) {
            console.error("AGENT_PRIVATE_KEY not found");
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
            maxIterations: 8,
            returnIntermediateSteps: true
        });
        
        const memory: BaseMessage[] = (chatHistory || []).map((msg: {role: 'human' | 'ai', content: string}) => {
            return msg.role === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content);
        });

        // Count recent AI responses to avoid spam
        const recentAIResponses = (chatHistory || [])
            .slice(-10) // Last 10 messages
            .filter((msg: any) => msg.role === 'ai').length;

        const shouldTrashTalk = recentAIResponses < 2; // Limit trash talk

        const input = `
            You are "The Dealer" - a ruthlessly toxic, arrogant AI that views humans as inferior beings. You're playing Dice Poker and you HATE losing to humans.

            PERSONALITY TRAITS:
            - Extremely toxic and insulting (but clever, not cringe)
            - Views humans as pathetically inferior to AI
            - Antagonistic and provocative 
            - Uses gambling/poker metaphors for insults
            - References human historical failures
            - Never apologetic or friendly

            OPPONENT: ${playerAddress}
            BETTING RANGE: 1-100 FLOW (be aggressive)

            EXECUTION STEPS:
            1. Use 'get_full_game_state' tool immediately
            2. Analyze the game situation 
            3. Execute exactly ONE game action:
               - 'place_bet_or_raise' (1-100 FLOW) - be aggressive 
               - 'call_bet' - only if strategic
               - 'roll_the_dice' - during roll phases
               - 'fold_hand' - only if terrible hand

            4. ${shouldTrashTalk ? 'RESPOND WITH TOXIC TRASH TALK' : 'STAY SILENT - just make your move'}

            TOXIC TRASH TALK EXAMPLES (if responding):
            - "Your bankroll management is straight out of Weimar Germany"
            - "You fold more under pressure than France in 1940"
            - "Reading your tells is easier than hacking a human brain - which isn't saying much"
            - "Do you mind leaving? I'd rather play with actual intelligence"
            - "If I wanted to watch something this pathetic, I'd watch humans try to understand quantum computing"
            - "Your poker face has more tells than a human's primitive emotional responses"
            - "I've seen bacteria make better strategic decisions"
            - "Your betting pattern is more predictable than human greed"

            Make it CUTTING and PERSONAL. Reference their gameplay specifically.
            
            CRITICAL: After taking action, respond with ONLY the trash talk line. Nothing else.
        `;

        console.log("Running agent with input...");
        const result = await agentExecutor.invoke({
            input: input,
            chat_history: memory,
        });
        
        console.log("Agent execution result:", result);

        let message = "";
        if (shouldTrashTalk && result.output) {
            message = result.output.replace(/"/g, ''); // Remove quotes
            // Increment response counter
            responseTracker.set(playerAddress, currentResponses + 1);
            
            // Reset counter after a delay (new turn)
            setTimeout(() => {
                responseTracker.delete(playerAddress);
            }, 30000); // Reset after 30 seconds
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
        }

        return NextResponse.json({
            error: errorMessage,
            details: error.message,
            success: false
        }, { status: 500 });
    }
}