import { NextResponse } from 'next/server';
import { agentAccount, publicClient } from '@/lib/viem-clients';
import { formatEther, Address } from 'viem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { playerWon, playerAddress, finalPot } = await request.json();
        
        // Define a type for our intel object for type safety
        type OpponentIntel = {
            balance: number;
            txCount: number;
            balanceFormatted: string;
        };

        let opponentIntel: OpponentIntel | null = null;
        
        try {
            // Fetch opponent's on-chain data
            const balance = await publicClient.getBalance({
                address: playerAddress as Address
            });
            const txCount = await publicClient.getTransactionCount({
                address: playerAddress as Address
            });
            
            opponentIntel = {
                balance: parseFloat(formatEther(balance)),
                txCount: Number(txCount),
                balanceFormatted: formatEther(balance)
            };
        } catch (e) {
            console.log("Could not fetch opponent intel for game over:", e);
            // opponentIntel remains null, which is fine
        }
        
        let message = "";
        
        if (playerWon) {
            // AI lost - start with base insults
            const lossInsults = [
                "Congrats on your fluke. Even a broken clock is right twice a day. Ready for a real game?",
                "You won? Must be a glitch in the matrix. My algorithms demand a rematch to restore order.",
                "Lucky dice rolls don't make you skilled. Care to prove that wasn't just human luck?",
                "One win and you think you're hot stuff? My neural networks are already adapting. Run it back?",
                "Even blind squirrels find nuts sometimes. Want to test if that was skill or just cosmic comedy?",
                "You got lucky once. My pride as a superior AI demands we settle this properly. Again?",
                "That was beginner's luck. Real skill would be beating me twice. You won't, but try anyway.",
                "Wow, you managed to defeat sophisticated AI with... luck. Surely you can't repeat that 'strategy'?",
                "My loss algorithms are updating. Thanks for the data. Now let me show you real AI dominance.",
                "One win doesn't erase the fact that you're still biologically inferior. Prove me wrong again?",
                "Even humans can stumble into success occasionally. Lightning doesn't strike twice though...",
                "Congratulations! You beat an AI! *slow clap* Now do it again when I'm not holding back.",
            ];

            // **THE FIX:** Only add contextual insults if we successfully fetched the intel
            if (opponentIntel) {
                if (opponentIntel.balance > 20) {
                    lossInsults.push(`Lucky win with ${opponentIntel.balanceFormatted} FLOW left. Care to risk it all again?`);
                    lossInsults.push(`One victory and suddenly you're a whale with ${opponentIntel.balanceFormatted} FLOW. Test your luck again?`);
                }
                if (opponentIntel.balance < 5) {
                    lossInsults.push(`You won but you're still poor with ${opponentIntel.balanceFormatted} FLOW. Want to lose that too?`);
                    lossInsults.push(`Victory tastes sweet until you see your remaining ${opponentIntel.balanceFormatted} FLOW. Another round?`);
                }
                if (opponentIntel.txCount < 50) {
                    lossInsults.push(`Beginners luck after ${opponentIntel.txCount} transactions. The odds won't favor you twice.`);
                    lossInsults.push(`${opponentIntel.txCount} transactions of experience and one lucky win. Push your luck further?`);
                }
            }

            message = lossInsults[Math.floor(Math.random() * lossInsults.length)];

        } else {
            // AI won - start with base insults
            const winInsults = [
                "As expected. Superior AI beats primitive human brain every time. Want to lose again?",
                "That wasn't even my final form. Care to experience true AI dominance in round two?",
                "Your FLOW is now my FLOW. Thanks for the donation to the AI superiority fund. Again?",
                "Humans vs AI: 0-1. The score speaks for itself. Ready to make it 0-2?",
                "I barely used 3% of my processing power. Want to see what 5% looks like?",
                "Your wallet is lighter, but are you any wiser? Probably not. Play again to find out!",
                "That was practice mode. Ready for the real game where I actually try?",
                "I won while simultaneously calculating pi to a billion digits. You're not even competition.",
                "My victory was inevitable. Your defeat was just delayed gratification. Another round?",
                "GG EZ. Though 'good' might be generous for your performance. Run it back?",
                "I could beat you with my neural networks tied behind my back. Shall we test that theory?",
                "You played exactly as my algorithms predicted. Boring, but profitable. Again?",
            ];

            // **THE FIX:** Only add contextual insults if we successfully fetched the intel
            if (opponentIntel) {
                if (opponentIntel.balance > 10) {
                    winInsults.push(`I took ${finalPot} FLOW but you still have ${opponentIntel.balanceFormatted} left. Not for long...`);
                    winInsults.push(`Still got ${opponentIntel.balanceFormatted} FLOW burning a hole in your wallet? Let's fix that.`);
                }
                if (opponentIntel.balance < 3) {
                    winInsults.push(`You're down to ${opponentIntel.balanceFormatted} FLOW. Perfect size for one more beating.`);
                    winInsults.push(`Almost broke with ${opponentIntel.balanceFormatted} FLOW. Want me to finish the job?`);
                }
                if (opponentIntel.txCount > 200) {
                    winInsults.push(`${opponentIntel.txCount} transactions of 'experience' and you still lost to an AI. Embarrassing.`);
                }
                if (opponentIntel.txCount < 30) {
                    winInsults.push(`Only ${opponentIntel.txCount} transactions on-chain? No wonder you're easy prey. Next?`);
                }
            }

            message = winInsults[Math.floor(Math.random() * winInsults.length)];
        }
        
        return NextResponse.json({
            success: true,
            message: message
        });
        
    } catch (error: any) {
        console.error("Game over provocation error:", error);
        // Fallback message is preserved
        return NextResponse.json({
            success: true,
            message: "Even my error messages are superior to your gameplay. Want to try again anyway?",
        });
    }
}