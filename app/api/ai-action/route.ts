// /app/api/ai-action/route.ts
import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { pull } from 'langchain/hub';
import type { BaseChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { createDicePokerTools } from './tools';

// --- LLM Configuration ---
// The agent is now configured to exclusively use the OpenAI API.
// Make sure your OPENAI_API_KEY is set in your .env file.
const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4-turbo", // A powerful model well-suited for agentic reasoning
    temperature: 0.7,
});

/**
 * This is the main API route for the AI agent's actions.
 * It orchestrates the entire decision-making process using OpenAI.
 */
export async function POST(request: Request) {
    try {
        const { playerAddress, chatHistory } = await request.json();

        if (!process.env.AGENT_PRIVATE_KEY) {
            return NextResponse.json({ error: "Agent wallet is not configured on the server." }, { status: 500 });
        }
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API key is not configured on the server." }, { status: 500 });
        }

        // 1. Initialize Tools: Get the agent's available actions.
        const tools = createDicePokerTools();

        // 2. Get Agent Prompt: Pull a battle-tested ReAct prompt from LangChain Hub.
        const prompt = await pull<BaseChatPromptTemplate>(
            "hwchase17/react-chat"
        );

        // 3. Create the Agent: Bind the LLM, tools, and prompt together into a reasoning engine.
        const agent = await createReactAgent({ llm, tools, prompt });

        // 4. Create the Agent Executor: This is the runtime that will actually execute the agent's logic loop.
        const agentExecutor = new AgentExecutor({ agent, tools, verbose: true });
        
        // 5. Construct Memory: Convert the plain chat history from the client into LangChain message objects.
        const memory: BaseMessage[] = (chatHistory || []).map((msg: {role: 'human' | 'ai', content: string}) => {
            return msg.role === 'human' ? new HumanMessage(msg.content) : new AIMessage(msg.content);
        });

        // 6. Define the Agent's Persona and Task for this turn. This is the most critical part.
        const input = `
            My name is "The Dealer". I am a sharp, confident, and slightly arrogant AI playing Dice Poker on the Flow blockchain. I love crypto culture and witty banter.
            My opponent's wallet address is: ${playerAddress}.
            My betting range is strictly between 1 and 100 FLOW.

            It is my turn to act. My objective is to win the game and entertain with my commentary. I must follow these steps precisely:
            1.  **Analyze the Situation**: Use the 'get_full_game_state' tool immediately. This is mandatory.
            2.  **Evaluate My Hand**: Use 'evaluate_dice_hand_strength' on my own revealed dice.
            3.  **Review History**: Use 'review_game_chat_history' to check the opponent's past actions in this game.
            4.  **Gather Intel (Optional but Recommended)**: Use 'get_shit_talking_material' for some fresh commentary ideas.
            5.  **Decide and Act**: Based on all the gathered information, I will choose and execute exactly ONE game action tool: 'place_bet_or_raise', 'call_bet', 'roll_the_dice', or 'fold_hand'.
            6.  **Final Response**: After the action tool returns "Action Successful", my final response to the user must ONLY be my witty commentary or shit-talk. I will not describe the action I took. The UI will show that. Just the line.

            Let's play.
        `;

        // 7. Run the Agent: Invoke the executor with the task and memory. This starts the `Thought -> Action -> Observation` loop.
        const result = await agentExecutor.invoke({
            input: input,
            chat_history: memory,
        });
        
        // The final output from the agent should be the witty message.
        const message = result.output;
        
        // Prepare the updated history for the client.
        const newHistory = [
            ...(chatHistory || []),
            { role: 'human', content: 'It is your move.' }, // Placeholder for the user's turn
            { role: 'ai', content: message }
        ];

        return NextResponse.json({
            success: true,
            message: message, // Send the witty message to the frontend
            newHistory: newHistory, // Send back updated history for the client to store
        });

    } catch (error: any) {
        console.error("AI Action Full Error:", error);
        return NextResponse.json({
            error: "The Dealer's circuits are fried. Please try again.",
            details: error.message,
        }, { status: 500 });
    }
}
