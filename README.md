# 🎲 Flow Poker: The On-Chain Agent-Ran Casino

A fully on-chain, personality-driven Dice Poker experience built on the Flow blockchain, featuring a toxic AI dealer powered by LangChain and grounded in verifiable on-chain data.

**Live Demo:** [PLAY HERE](https://v0-modern-gambling-website-zeta.vercel.app/)

**Video Walkthrough:** [WATCH HERE]()

**Fully On-Chain Dice Poker Contract on Flow EVM Testnet:** `0xC0933C5440c656464D1Eb1F886422bE3466B1459`

---

## 💡 The Killer App: More Than Just a Game

Consumer-oriented "killer apps" are defined by their ability to create uniquely engaging experiences at scale. Flow Poker isn't just another blockchain-based card game; it's a new paradigm of interactive on-chain entertainment. It tackles the core challenges of Web3 gaming, lifeless NPCs and questionable fairness, by introducing a formidable, personality-driven AI opponent and leveraging Flow's native Verifiable Random Function (VRF) for provably fair gameplay.

Our vision is to build the first truly **agentic on-chain casino**, an ecosystem where autonomous AI agents, each with distinct personalities and strategies, manage games, interact with players, and operate with the full transparency and integrity of the Flow blockchain. This project is the first, crucial step towards that future.

---

## ✨ Key Features

-   **Advanced AI Dealer**: A ruthless, toxic AI opponent built with LangChain & AgentKit on Flow that uses a ReAct framework to make strategic, on-chain decisions.
-   **Provably Fair Randomness**: Dice rolls are powered by Flow's native Solidity VRF, ensuring that every outcome is cryptographically secure, transparent, and cannot be manipulated by the house or players.
-   **On-Chain Intelligence**: The AI grounds its behavior in reality by making real-time calls to the Flow blockchain. It checks its own balance, requests funds from the faucet when low, and, most importantly, spies on the opponent's on-chain activity to generate unique, cutting trash talk.
-   **Autonomous Agent Infrastructure**: Built with modern agent architecture principles, featuring self-funding capabilities and real-time blockchain intelligence gathering.
-   **Full Flow Ecosystem Integration**: Seamlessly integrates Flow's FCL for wallet discovery alongside EVM contract interactions, demonstrating true multi-layer Flow development.
-   **Two Full Game Modes**:
    -   **Player vs. Environment (PvE)**: Challenge the formidable AI Dealer in a battle of wits and luck.
    -   **Player vs. Player (PvP)**: Face off against other human players in a classic poker showdown.
-   **Seamless Frontend**: A responsive and modern user interface built with Next.js, React, and Tailwind CSS, offering a smooth and intuitive gameplay experience.
-   **Direct Wallet Integration**: Securely connects to user wallets using viem and ethers, handling all on-chain transactions seamlessly.

---

## 🏛️ Technical Architecture

The project is architected with a clear separation of concerns, blending a traditional web stack with a powerful on-chain and AI backend.

### 1. Smart Contract (The Unbreakable House)

The core game logic resides in a Solidity smart contract deployed on the **Flow EVM Testnet**.

-   **State Machine**: The contract manages the entire game flow using a robust `GameState` enum, ensuring players can only take valid actions at the correct times.
-   **Flow Native VRF**: This is the heart of the game's integrity. Instead of relying on insecure, off-chain random number generators, dice rolls call `CADENCE_ARCH.getRandom()`. This native precompile provides verifiable, unbiased randomness directly on-chain, making every roll provably fair and building immense trust with the player.
-   **Game Logic**: Manages player joins, betting rounds (bets, calls), pot management, and winner determination based on the final dice scores.
-   **Safety Mechanism**: Includes a `resetIfExpired()` function to allow anyone to reset a stuck or abandoned game after a timeout, ensuring the contract never becomes permanently locked.

### 2. AI Agent Backend (The Dealer's Brain)

The AI Dealer is not a simple script; it's an autonomous agent powered by a Next.js API route (`/api/ai-action`) using the LangChain framework with modern agent architecture principles.

-   **ReAct Agent Framework**: The agent uses a ReAct (Reason + Act) framework to make decisions. It forms a "thought," chooses a tool, executes it, observes the result, and repeats this loop until it reaches a final conclusion.
-   **Centralized Blockchain Client**: Uses modern `viem` library for all blockchain interactions, providing type-safe, efficient contract calls and real-time data access.
-   **Custom On-Chain Tools**: We've equipped the agent with a suite of custom tools that serve as its senses and hands on the blockchain:
    -   `get_full_game_state`: Reads all relevant data from the contract in a single multicall for efficiency.
    -   `check_agent_balance` & `request_faucet_funds`: Allows the agent to manage its own wallet, demonstrating autonomous resource management and "cheating" capabilities.
    -   `place_bet_or_raise`, `call_bet`, `fold_hand`, `roll_the_dice`: Executes the actual on-chain game transactions.
    -   `get_opponent_onchain_intel`: The agent's "spyglass." It uses viem's `publicClient` to read the opponent's live wallet balance and transaction count directly from the Flow blockchain for personalized trash talk.
-   **Enhanced Chat Intelligence**: Interactive chat system that analyzes opponent behavior and wallet data to generate contextual, cutting insults in real-time.
-   **Personality-Driven Prompt Engineering**: The agent's persona is engineered through a detailed prompt that includes its personality traits, core directives (like "NEVER FOLD when ahead"), and examples of its toxic style. This ensures its behavior is both strategic and in-character.

### 3. Frontend (The Casino Floor)

The user interface is a modern Next.js 14 application built with the App Router, featuring full Flow ecosystem integration.

-   **Dual-Layer Flow Integration**: 
    -   **FCL Integration**: Uses Flow's Client Library (FCL) for wallet discovery and native Flow authentication
    -   **EVM Contract Interaction**: Maintains direct Solidity contract calls via viem for game mechanics
    -   **Unified Experience**: Seamlessly bridges Flow's native layer with EVM layer for comprehensive blockchain interaction
-   **React & State Management**: Uses React `useState` and `useEffect` hooks to manage the complex game state and trigger blockchain data re-fetches.
-   **Blockchain Connectivity**: The `lib/web3.ts` and `lib/viem-clients.ts` modules handle wallet connections (MetaMask, etc.), contract instantiation, and event listeners, abstracting away the complexity from the UI components.
-   **Component-Based UI**: The UI is built with shadcn/ui and Tailwind CSS, providing a clean, responsive, and aesthetically pleasing experience that feels like a premium gaming application.

---

## 🤖 Agent Architecture Highlights

### Self-Sustaining Autonomous Operations
- **Self-Funding**: Agent automatically requests testnet funds when balance is low, ensuring uninterrupted gameplay
- **Balance Monitoring**: Continuously tracks its own wallet state and responds autonomously
- **Resource Management**: Intelligent fund allocation and conservation strategies

### On-Chain Intelligence Gathering
- **Real-Time Wallet Analysis**: Analyzes opponent's transaction history, balance, and on-chain activity patterns
- **Personalized Interaction**: Generates unique, data-driven trash talk based on opponent's financial status and blockchain experience
- **Adaptive Strategy**: Adjusts gameplay strategy based on opponent's on-chain behavior patterns

### Modern Agent Development Practices
- **Tool-Based Architecture**: Modular, composable tools that can be easily extended or modified
- **Type-Safe Interactions**: Full TypeScript integration with proper type assertions for blockchain data
- **Error Handling & Recovery**: Robust error handling with graceful degradation and automatic retry mechanisms

---

## 🤯 An Unexpected Feature: The Agent as Auditor

During development, our AI agent discovered a critical vulnerability in the smart contract. It learned that it could execute functions out of the intended order to gain an unfair advantage.

This immediately highlighted the need for a patch to harden the contract's state management, closing an exploit that could have been abused by automated scripts. The incident also demonstrated a powerful, unintended use case: leveraging autonomous agents as on-chain security auditors to find vulnerabilities before they're exploited maliciously.

---

## 🌊 Flow Ecosystem Integration

This project showcases comprehensive integration with Flow's unique multi-layer architecture:

### EVM Layer Integration
- **Solidity Smart Contracts**: Core game logic deployed on Flow EVM Testnet
- **Flow Native VRF**: Leverages `CADENCE_ARCH.getRandom()` for provably fair randomness
- **Modern Tooling**: Uses viem for type-safe, efficient blockchain interactions

### Flow Native Layer Integration  
- **FCL (Flow Client Library)**: Integrated for wallet discovery and authentication
- **Wallet Discovery Service**: Access to Flow's ecosystem of wallets without custom integrations
- **Future Cadence Ready**: Architecture prepared for future Cadence smart contract integration

### Cross-Layer Benefits
- **Unified User Experience**: Single connection flow for both layers
- **Ecosystem Compatibility**: Works with all FCL-compatible wallets
- **Developer Experience**: Demonstrates best practices for multi-layer Flow development

---

## Submission Criteria

### Most Killer App Potential

Flow Poker is designed from the ground up to be a "killer app" by solving real user problems and creating an experience that is impossible off-chain.

-   **Engaging & Retentive Gameplay**: The toxic AI dealer creates a highly engaging, memorable, and challenging opponent that players will want to return to and beat. It's not just a game; it's a rivalry.
-   **Provable Fairness with Flow VRF**: It solves one of the biggest pain points in online gambling: trust. By using Flow's native VRF, we can mathematically prove to users that every dice roll is fair, a killer feature for any game of chance.
-   **Seamless Onboarding & Interaction**: The application's core logic is powered by a fully-on-chain Dice Poker Solidity smart contract deployed to the Flow EVM Testnet. To create a frictionless user experience, the frontend uses Flow's FCL to handle wallet connections, providing a simple, one-click login that abstracts away blockchain complexities.
-   **The Agentic Casino Vision**: This is not just one game. It's the proof-of-concept for an entire ecosystem of on-chain, autonomous game operators. Imagine agent-run Blackjack tables, agent-hosted tournaments, and AI market makers for prediction markets, all operating with the transparency and security of Flow. This has immense potential for mass adoption.

### AI & Autonomous Infrastructure

This project directly addresses the challenge of grounding AI in verifiable systems with modern agent architecture.

-   **Grounding Intelligence in On-Chain Data**: The agent's intelligence is not confined to its pre-trained knowledge. It actively queries the Flow blockchain for real-time, verifiable data (game state, opponent balance, tx count) to inform its strategy and its insults. This grounds its behavior in an open, trusted system, preventing the kind of "hallucination" common in closed-system AIs.
-   **Self-Sustaining Operations**: The agent demonstrates true autonomy by managing its own resources, automatically requesting funds when needed, and operating independently without human intervention.
-   **Reliable Autonomous Entity**: The agent is designed to be a reliable system. It checks its own balance and can self-fund via a faucet. The prompt engineering ensures it follows strict rules (like rolling the dice *only when required*), making it a dependable game operator.
-   **Modern Agent Development**: Built with contemporary agent architecture principles, featuring tool-based interactions, type-safe blockchain operations, and comprehensive error handling.
-   **Future Potential with EVM++ & Cadence**: This architecture sets the stage for even deeper integration with Flow's unique features. Future iterations could explore:
    -   **Account Linking**: Giving the agent control over a dedicated game account that users can easily recover funds from if the agent ever went offline.
    -   **Cadence for Complex Transactions**: Using Cadence to script batched or complex scripted transactions, such as an agent distributing tournament winnings to multiple players in a single, atomic transaction.

---

## 🛠️ Getting Started

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/PhatDot1/FlowDice
    cd https://github.com/PhatDot1/FlowDice
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment:**
    Create a `.env.local` file in the root of the project and add the following variables:
    ```
    # Your wallet's private key (without the '0x' prefix) for the AI agent
    PRIVATE_KEY=...

    # The RPC URL for Flow EVM Testnet
    FLOW_TESTNET_RPC_URL=https://testnet.evm.nodes.onflow.org

    # The address of your deployed DicePoker smart contract
    NEXT_PUBLIC_CONTRACT_ADDRESS=...

    # Your OpenAI API Key
    OPENAI_API_KEY=...

    # (Optional) Your Flowscan API Key for the opponent intel tool
    FLOWSCAN_API_KEY=...
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## 🔧 Technical Stack

### Frontend
- **Next.js 14** with App Router
- **React 18** with modern hooks
- **TypeScript** for type safety
- **Tailwind CSS** + **shadcn/ui** for styling
- **FCL (Flow Client Library)** for Flow ecosystem integration

### Blockchain Integration
- **viem** for modern, type-safe Ethereum interactions
- **ethers.js** for contract interactions
- **Flow EVM Testnet** for smart contract deployment
- **Flow Native VRF** for provably fair randomness

### AI & Agent Infrastructure
- **LangChain** for agent framework
- **OpenAI GPT-4** for intelligent decision making
- **ReAct Architecture** for reasoning and action loops
- **Custom Tools** for blockchain interaction

### Development Tools
- **TypeScript** throughout the entire stack
- **ESLint** for code quality
- **Prettier** for code formatting

---

## Team

-   **PhatDot/PPWoo**: @P_Pwoo

---

## NOTE

Chat functionality is temporarily disabled in the live deployment to manage API costs, but can be easily enabled by uncommenting the chat component in the PvE page. The agent's autonomous gameplay and trash talk during game actions remain fully functional.
