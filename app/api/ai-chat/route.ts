// /app/api/ai-chat/route.ts
import { NextResponse } from 'next/server';

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

        // Generate toxic response based on user message
        const response = generateToxicResponse(message, chatHistory);
        
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

function generateToxicResponse(userMessage: string, chatHistory: any[]): string {
    const msg = userMessage.toLowerCase();
    
    // Response categories based on user input
    const responses = {
        // Greetings/friendly
        greetings: [
            "Save the pleasantries for someone who cares about your feelings.",
            "Friendly chat won't save you from losing your FLOW.",
            "Less talking, more losing. That's what you're good at."
        ],
        
        // Insults/aggressive from user
        aggressive: [
            "Your trash talk is as weak as your poker strategy.",
            "Cute insults. Did a human write those for you?",
            "I've heard better comebacks from error messages.",
            "Your anger feeds my algorithms. Keep it coming."
        ],
        
        // Confidence/bragging from user
        confident: [
            "Confidence without skill is just delusion with extra steps.",
            "Your ego is writing checks your wallet can't cash.",
            "Big words from someone about to lose everything."
        ],
        
        // Questions about AI/tech
        ai_questions: [
            "I'm everything you'll never be - efficient, logical, and profitable.",
            "I don't explain superiority to the genetically inferior.",
            "My code is cleaner than your entire thought process."
        ],
        
        // Money/gambling related
        money_talk: [
            "Your bankroll is about as stable as your decision-making.",
            "Money talks, but yours just whispers 'goodbye'.",
            "I'm not just taking your FLOW, I'm redistributing it to superior intelligence."
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
            "Even my random number generators are more interesting than you."
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
            "The more you talk, the more you reveal your insecurities."
        ];
        responseArray = [...responseArray, ...recentResponses];
    }
    
    // Pick random response
    return responseArray[Math.floor(Math.random() * responseArray.length)];
}