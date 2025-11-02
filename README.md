# Decentralized Blackjack Game

## Project Title
**Stellar Blockchain Blackjack: Provably Fair On-Chain Casino Game**

## Project Description
The Decentralized Blackjack Game is a fully on-chain casino game built on the Stellar blockchain using Soroban smart contracts. This implementation brings the classic card game of Blackjack (also known as 21) to the blockchain, where players can place bets using Stellar tokens and play against an automated dealer with complete transparency and fairness. The smart contract handles all game logic including card dealing, hand evaluation, player actions (hit/stand), and automatic payout distribution based on traditional Blackjack rules.

The game utilizes blockchain's inherent randomness through Soroban's PRNG (Pseudo-Random Number Generator) for card dealing, ensuring fair gameplay. All game states, bets, and outcomes are permanently recorded on the blockchain, providing players with verifiable proof of fair play and eliminating the possibility of manipulation by any centralized authority.

## Project Vision
Our vision is to revolutionize online casino gaming by creating a trustless, transparent, and provably fair gambling ecosystem on the Stellar blockchain. We aim to:

- **Eliminate Trust Issues**: Remove the need to trust traditional online casinos by making all game logic transparent and verifiable on the blockchain
- **Ensure Fair Play**: Utilize blockchain-based randomness to guarantee that card dealing is truly random and cannot be manipulated
- **Instant Settlements**: Provide immediate, automated payouts through smart contracts without requiring manual intervention or withdrawal processes
- **Global Accessibility**: Enable anyone with a Stellar wallet to play Blackjack without geographical restrictions or banking intermediaries
- **Complete Transparency**: Allow players to audit game outcomes, verify randomness, and confirm payout calculations on-chain

By leveraging Soroban smart contracts, we envision a future where casino gaming is democratized, transparent, and accessible to everyone while maintaining the excitement and entertainment of traditional casino experiences.

## Key Features

- **Token-Based Betting**: Place bets using any Stellar token (XLM or custom assets) configured during contract initialization
- **Automated Dealing**: Smart contract automatically deals initial cards (2 to player, 2 to dealer) when a bet is placed
- **Classic Blackjack Rules**: Full implementation of standard Blackjack gameplay including:
  - Hit: Request additional cards to improve hand value
  - Stand: End turn and let dealer play their hand
  - Dealer must hit until reaching 17 or higher
  - Ace flexibility (counts as 1 or 11 automatically)
- **Automatic Hand Evaluation**: Real-time calculation of hand values with intelligent Ace adjustment
- **Instant Payout System**: Automatic token transfers based on game outcome:
  - Player wins: 2:1 payout (double the bet)
  - Push (tie): Bet returned
  - Player busts or loses: Bet forfeited
- **Provably Fair Randomness**: Uses Soroban's blockchain-based PRNG for transparent card generation
- **Game State Management**: Tracks game phases (Betting, PlayerTurn, DealerTurn, Resolved) to ensure proper game flow
- **Error Handling**: Comprehensive error codes for various game scenarios (invalid bets, unauthorized actions, wrong phase)
- **Single-Player Games**: Each player has their own isolated game session preventing interference
- **Immutable Game History**: All cards dealt and outcomes are recorded on the blockchain

## Future Scope

1. **Multi-Player Support**: Enable multiple simultaneous games with different players without conflicts

2. **Betting Limits**: Implement minimum and maximum bet limits to manage risk and ensure sustainable gameplay

3. **House Edge Adjustment**: Make payout ratios configurable (e.g., 3:2 for Blackjack, 1:1 for standard wins) to match traditional casino rules

4. **Split Hands**: Add ability to split pairs into two separate hands, doubling the betting opportunity

5. **Double Down**: Allow players to double their bet in exchange for receiving exactly one more card

6. **Insurance Bet**: Implement insurance side bet when dealer shows an Ace

7. **Blackjack Detection**: Special handling and bonus payout (3:2) when player gets 21 with first two cards

8. **Multi-Deck Shoe**: Implement a deck management system using multiple decks (typically 6-8) like real casinos

9. **Card Counting Prevention**: Reset deck after each game or implement continuous shuffle machine logic

10. **Game Statistics Dashboard**: Track player statistics including win/loss ratio, biggest wins, total wagered, and ROI

11. **Leaderboard System**: Global leaderboard showing top players by winnings, win streaks, or games played

12. **Side Bets**: Additional betting options like Perfect Pairs, 21+3, or Lucky Ladies for extra excitement

13. **VIP Tiers**: Loyalty program with benefits for frequent players (reduced house edge, exclusive tables)

14. **Tournament Mode**: Scheduled tournaments where players compete for prize pools with buy-in fees

15. **Social Features**: Chat functionality, friend challenges, and shared game replays

16. **Mobile Integration**: Native mobile app integration with Freighter wallet support for seamless mobile gaming

17. **Responsible Gaming**: Implement betting limits, cool-down periods, and self-exclusion options

18. **Live Dealer Integration**: Hybrid mode combining blockchain verification with live video dealer for authentic casino experience

19. **Cross-Chain Bridge**: Enable players from other blockchains to participate using wrapped tokens

20. **House Bankroll Management**: DAO-managed house bankroll where token holders share in casino profits and losses

---
## Contract Details
Contract ID: CBWQ4AMQBZHLSAAS26WNF43WDTGCEFKNOVSETP5A3HKZR7X2GLUGQ3AI
<img width="1919" height="725" alt="image" src="https://github.com/user-attachments/assets/b012e8c9-10db-429d-b1db-2aba9ab82a43" />


**Built with Soroban SDK** | **Stellar Blockchain Platform** | **Provably Fair Gaming** | **Instant Payouts**

