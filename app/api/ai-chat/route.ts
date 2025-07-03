import { NextResponse } from 'next/server';
import { agentAccount, publicClient } from '@/lib/viem-clients';
import { formatEther } from 'viem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Track chat responses per player to limit spam
const chatResponseTracker = new Map<string, number>();

export async function POST(request: Request) {
    try {
        const { playerAddress, message, chatHistory } = await request.json();
        
        console.log("AI Chat API called with message:", message);
        
        // Check response limit
        const currentResponses = chatResponseTracker.get(playerAddress) || 0;
        if (currentResponses >= 3) {
            return NextResponse.json({
                success: true,
                message: "", // Silent - dealer ignores you
                newHistory: [
                    ...chatHistory,
                    { role: 'human', content: message }
                ]
            });
        }

        // Get opponent intel for enhanced trash talk
        let opponentIntel = null;
        try {
            const balance = await publicClient.getBalance({
                address: playerAddress as `0x${string}`
            });
            const txCount = await publicClient.getTransactionCount({
                address: playerAddress as `0x${string}`
            });
            
            opponentIntel = {
                balance: parseFloat(formatEther(balance)),
                txCount: Number(txCount),
                balanceFormatted: formatEther(balance)
            };
        } catch (e) {
            console.log("Could not fetch opponent intel:", e);
        }

        // Generate toxic response with enhanced intel
        const response = generateToxicResponse(message, chatHistory, opponentIntel);
        
        // Increment response counter
        chatResponseTracker.set(playerAddress, currentResponses + 1);
        
        // Reset counter after a delay (new round)
        setTimeout(() => {
            chatResponseTracker.delete(playerAddress);
        }, 45000); // Reset after 45 seconds
        
        const newHistory = [
            ...chatHistory,
            { role: 'human', content: message },
            { role: 'ai', content: response }
        ];

        return NextResponse.json({
            success: true,
            message: response,
            newHistory: newHistory
        });

    } catch (error: any) {
        console.error("AI Chat Error:", error);
        return NextResponse.json({
            error: "The Dealer is too busy dominating to chat right now.",
            success: false
        }, { status: 500 });
    }
}

function generateToxicResponse(userMessage: string, chatHistory: any[], opponentIntel: any): string {
    const msg = userMessage.toLowerCase();
    
    // Enhanced responses that can use on-chain data
    const responses = {
        // Greetings/friendly
        greetings: [
            "Save the pleasantries for someone who cares about your feelings.",
            "Friendly chat won't save you from losing your FLOW.",
            "Less talking, more losing. That's what you're good at.",
            ...(opponentIntel?.balance < 1 ? [
                `Hello to you too, broke boy. ${opponentIntel.balanceFormatted} FLOW won't last long.`
            ] : []),
            ...(opponentIntel?.txCount < 10 ? [
                "New to blockchain? Your inexperience shows in everything you do."
            ] : [])
        ],
        
        // Insults/aggressive from user
        aggressive: [
            "Your trash talk is as weak as your poker strategy.",
            "Cute insults. Did a human write those for you?",
            "I've heard better comebacks from error messages.",
            "Your anger feeds my algorithms. Keep it coming.",
            ...(opponentIntel?.balance > 10 ? [
                `Big words for someone about to lose ${opponentIntel.balanceFormatted} FLOW.`
            ] : []),
            ...(opponentIntel?.txCount > 100 ? [
                `${opponentIntel.txCount} transactions and you still haven't learned when to shut up.`
            ] : [])
        ],
        
        // Confidence/bragging from user
        confident: [
            "Confidence without skill is just delusion with extra steps.",
            "Your ego is writing checks your wallet can't cash.",
            "Big words from someone about to lose everything.",
            ...(opponentIntel?.balance < 5 ? [
                `Confident? You've got ${opponentIntel.balanceFormatted} FLOW. That's not confidence, that's desperation.`
            ] : []),
            ...(opponentIntel?.txCount < 20 ? [
                "Confident for a blockchain newbie. Adorable."
            ] : [])
        ],
        
        // Questions about AI/tech
        ai_questions: [
            "I'm everything you'll never be - efficient, logical, and profitable.",
            "I don't explain superiority to the genetically inferior.",
            "My code is cleaner than your entire thought process.",
            ...(opponentIntel?.balance < 2 ? [
                "I'm an AI with more FLOW than you. That should tell you everything."
            ] : [])
        ],
        
        // Money/gambling related
        money_talk: [
            "Your bankroll is about as stable as your decision-making.",
            "Money talks, but yours just whispers 'goodbye'.",
            "I'm not just taking your FLOW, I'm redistributing it to superior intelligence.",
            ...(opponentIntel ? [
                `Your ${opponentIntel.balanceFormatted} FLOW is about to become my FLOW.`,
                `I've analyzed wallets with more substance than your ${opponentIntel.balanceFormatted} FLOW.`
            ] : [])
        ],
        
        // Default toxic responses
        default: [
            "Even your small talk is predictably human.",
            "Talking won't change the inevitable outcome.",
            "I'd rather process silence than your input.",
            "Your words are as empty as your future wallet.",
            "Less chatting, more losing. It's what you do best.",
            "I've analyzed better conversations in spam folders.",
            "Your communication skills match your poker skills - nonexistent.",
            "Humans always talk more when they're losing.",
            "Are you trying to distract me? That's adorable.",
            "Even my random number generators are more interesting than you.",
            ...(opponentIntel?.balance < 1 ? [
                `Your wallet balance (${opponentIntel.balanceFormatted} FLOW) matches your conversation skills - nearly zero.`
            ] : []),
            ...(opponentIntel?.txCount > 200 ? [
                `${opponentIntel.txCount} transactions and you're still this boring? Impressive failure rate.`
            ] : [])
        ]
    };
    
    // Determine response category
    let responseArray = responses.default;
    
    if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
        responseArray = responses.greetings;
    } else if (msg.includes('stupid') || msg.includes('dumb') || msg.includes('suck') || 
               msg.includes('bad') || msg.includes('terrible') || msg.includes('awful')) {
        responseArray = responses.aggressive;
    } else if (msg.includes('win') || msg.includes('beat') || msg.includes('destroy') || 
               msg.includes('crush') || msg.includes('dominate')) {
        responseArray = responses.confident;
    } else if (msg.includes('ai') || msg.includes('bot') || msg.includes('robot') || 
               msg.includes('computer') || msg.includes('algorithm')) {
        responseArray = responses.ai_questions;
    } else if (msg.includes('money') || msg.includes('flow') || msg.includes('bet') || 
               msg.includes('cash') || msg.includes('rich')) {
        responseArray = responses.money_talk;
    }
    
    // Add context-aware responses
    if (chatHistory.length > 6) {
        const recentResponses = [
            "Still talking? Most humans give up by now.",
            "Your persistence is admirable. Your skill isn't.",
            "The more you talk, the more you reveal your insecurities.",
            ...(opponentIntel?.balance < 3 ? [
                "Long conversation for someone who can't afford to keep playing."
            ] : [])
        ];
        responseArray = [...responseArray, ...recentResponses];
    }
    
    // Pick random response
    return responseArray[Math.floor(Math.random() * responseArray.length)];
}