// /app/api/ai-game-over/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const { playerWon, playerAddress, finalPot } = await request.json();
        
        let message = "";
        
        if (playerWon) {
            // AI lost - be EXTRA toxic and provocative to get them to play again
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
                "Congratulations! You beat an AI! *slow clap* Now do it again when I'm not holding back."
            ];
            message = lossInsults[Math.floor(Math.random() * lossInsults.length)];
        } else {
            // AI won - be smug and challenge them to try again
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
                "You played exactly as my algorithms predicted. Boring, but profitable. Again?"
            ];
            message = winInsults[Math.floor(Math.random() * winInsults.length)];
        }
        
        return NextResponse.json({
            success: true,
            message: message
        });
        
    } catch (error: any) {
        console.error("Game over provocation error:", error);
        return NextResponse.json({
            error: "Even my error messages are superior to your gameplay.",
            success: false
        }, { status: 500 });
    }
}