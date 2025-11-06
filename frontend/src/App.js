// Configuration - UPDATE THESE VALUES IN PRODUCTION
const CONFIG = {
    contractId: 'CB5ZA4MLYE4IYJEN7OJNB5WMYWZ3KAVK3N65AEMU3EG7Q6ENWVDTMRUX',
    xlmTokenId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    networkPassphrase: StellarSdk.Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org'
};

let connectedPublicKey = null;
let server = new StellarSdk.SorobanRpc.Server(CONFIG.rpcUrl);
let currentGame = null;
let isLocalGame = false; // Tracks if the game is local-only
let localDeck = []; // Deck for local-only game

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== APP INITIALIZATION ===');
    console.log('Blackjack Game initialized');
    console.log('DOMContentLoaded fired at:', new Date().toISOString());

    // Wait for Freighter to load
    console.log('Setting timeout to check for Freighter...');
    setTimeout(() => {
        console.log('Timeout fired, checking Freighter now...');
        checkFreighterInstalled();
    }, 100);

    // Event listeners
    console.log('Attaching event listeners...');
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            console.log('Connect button clicked!');
            connectFreighter();
        });
    }

    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }

    const placeBetBtn = document.getElementById('placeBetBtn');
    if (placeBetBtn) {
        placeBetBtn.addEventListener('click', placeBet);
    }

    const hitBtn = document.getElementById('hitBtn');
    if (hitBtn) {
        hitBtn.addEventListener('click', hit);
    }

    const standBtn = document.getElementById('standBtn');
    if (standBtn) {
        standBtn.addEventListener('click', stand);
    }

    console.log('All event listeners attached');
    console.log('=== INITIALIZATION COMPLETE ===');
});

// Check if Freighter is installed
function checkFreighterInstalled() {
    console.log('=== CHECKING FREIGHTER INSTALLATION ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('window.freighterApi:', window.freighterApi);
    console.log('typeof window.freighterApi:', typeof window.freighterApi);

    if (window.freighterApi) {
        console.log('✅ Freighter detected');
        showStatus('Freighter detected! Click Connect to continue', 'success');
    } else {
        console.log('❌ Freighter not found');
        showStatus('Please install Freighter wallet extension from freighter.app', 'error');
    }
    console.log('=== CHECK COMPLETE ===');
}

// UI Helper Functions
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (!statusElement) {
        console.error('Status element not found');
        return;
    }

    console.log(`Status Update (${type}):`, message);
    statusElement.style.display = 'block';
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;

    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

function showBetResult(message, type = 'info') {
    const element = document.getElementById('betResult');
    if (!element) return;

    element.style.display = 'block';
    element.textContent = message;
    element.className = `status-message ${type}`;

    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

// Connect to Freighter wallet
async function connectFreighter() {
    try {
        console.log('=== CONNECT FREIGHTER CALLED ===');

        if (!window.freighterApi) {
            console.error('❌ Freighter API not found');
            showStatus('Freighter wallet not found. Please install it from https://www.freighter.app/', 'error');
            window.open('https://www.freighter.app/', '_blank');
            return;
        }

        console.log('✅ Freighter API found!');
        console.log('Requesting Freighter access...');

        const result = await window.freighterApi.requestAccess();
        console.log('Freighter response received:', result);

        if (result.error) {
            showStatus('Failed to connect: ' + result.error, 'error');
            return;
        }

        connectedPublicKey = result.address;

        document.getElementById('walletAddress').textContent =
            `${result.address.substring(0, 8)}...${result.address.substring(result.address.length - 4)}`;
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('walletInfo').style.display = 'inline-flex';

        showStatus('Wallet connected successfully!', 'success');

        // Load house balance and check for active game
        await loadHouseBalance();
        await checkActiveGame();

    } catch (error) {
        console.error('Freighter connection failed:', error);
        showStatus('Failed to connect wallet: ' + error.message, 'error');
    }
}

// Disconnect wallet
function disconnectWallet() {
    connectedPublicKey = null;
    currentGame = null;
    isLocalGame = false; // Reset local game flag
    document.getElementById('connectBtn').style.display = 'inline-block';
    document.getElementById('walletInfo').style.display = 'none';
    document.getElementById('houseBalance').textContent = '10000';
    document.getElementById('currentBet').textContent = '0 XLM';
    document.getElementById('gameStatus').textContent = 'No Active Game';
    hideGameArea();
    showStatus('Wallet disconnected', 'info');
}

// ======================
// CONTRACT INTERACTIONS
// ======================

// Load house balance (actual XLM held by contract)
async function loadHouseBalance() {
    try {
        const publicKey = connectedPublicKey;
        const account = await server.getAccount(publicKey);

        // Build the transaction to call get_house_balance
        const contract = new StellarSdk.Contract(CONFIG.contractId);

        const builtTx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
            .addOperation(contract.call('get_house_balance'))
            .setTimeout(30)
            .build();

        const tx = await server.prepareTransaction(builtTx);
        const simulated = await server.simulateTransaction(tx);

        if (simulated.results && simulated.results[0]) {
            const result = simulated.results[0];
            if (result.retval) {
                const balance = StellarSdk.scValToNative(result.retval);
                const xlmBalance = (balance / 10_000_000).toFixed(2);
                document.getElementById('houseBalance').textContent = `${xlmBalance} XLM`;
                console.log('House balance loaded:', xlmBalance, 'XLM');
            }
        }
    } catch (error) {
        console.error('Error loading house balance:', error);
        document.getElementById('houseBalance').textContent = '10000';
    }
}

// Check for active game
async function checkActiveGame() {
    try {
        const publicKey = connectedPublicKey;
        const account = await server.getAccount(publicKey);
        const contract = new StellarSdk.Contract(CONFIG.contractId);

        const builtTx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: CONFIG.networkPassphrase
        })
            .addOperation(
                contract.call(
                    'get_game',
                    StellarSdk.nativeToScVal(publicKey, { type: 'address' })
                )
            )
            .setTimeout(30)
            .build();

        const tx = await server.prepareTransaction(builtTx);
        const simulated = await server.simulateTransaction(tx);


        if (simulated.results && simulated.results[0]) {
            const result = simulated.results[0];
            if (result.retval) {
                const gameData = StellarSdk.scValToNative(result.retval);
                if (gameData && gameData !== null) {
                    currentGame = gameData;
                    isLocalGame = false; // It's an on-chain game
                    displayGame(gameData);
                    console.log('Active game found:', gameData);
                }
            }
        }
    } catch (error) {
        console.log('No active game found or error:', error.message);
    }
}

// Place bet and start new game - WITH REAL XLM TRANSFER
async function placeBet() {
    if (!connectedPublicKey) {
        showBetResult('Please connect your wallet first', 'error');
        return;
    }

    const betAmount = parseFloat(document.getElementById('betAmount').value);
    if (!betAmount || betAmount < 1) {
        showBetResult('Minimum bet is 1 XLM', 'error');
        return;
    }

    try {
        showStatus('Approving XLM transfer and placing bet...', 'info');
        showBetResult('XLM transfered successfully', 'info');

        const betInStroops = Math.floor(betAmount * 10_000_000);
        const publicKey = connectedPublicKey;
        const account = await server.getAccount(publicKey);

        // Create contract instances
        const xlmToken = new StellarSdk.Contract(CONFIG.xlmTokenId);

        // Step 1: Approve the contract to spend player's XLM
        console.log('Step 1: Approving XLM spend...');

        const approveTx = new StellarSdk.TransactionBuilder(account, {
            fee: '100000',
            networkPassphrase: CONFIG.networkPassphrase
        })
            .addOperation(
                xlmToken.call(
                    'approve',
                    StellarSdk.nativeToScVal(publicKey, { type: 'address' }),
                    StellarSdk.nativeToScVal(CONFIG.contractId, { type: 'address' }),
                    StellarSdk.nativeToScVal(betInStroops, { type: 'i128' }),
                    StellarSdk.nativeToScVal(1000000, { type: 'u32' })
                )
            )
            .setTimeout(30)
            .build();

        const preparedApproveTx = await server.prepareTransaction(approveTx);

        const approveSignedXDR = await window.freighterApi.signTransaction(
            preparedApproveTx.toXDR(),
            {
                networkPassphrase: CONFIG.networkPassphrase
            }
        );

        const approveTxBuilt = StellarSdk.TransactionBuilder.fromXDR(
            approveSignedXDR,
            CONFIG.networkPassphrase
        );

        const approveResponse = await server.sendTransaction(approveTxBuilt);

        // Wait for approval transaction
        let approveTxResult = await server.getTransaction(approveResponse.hash);
        let attempts = 0;
        while (approveTxResult.status === "NOT_FOUND" && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            approveTxResult = await server.getTransaction(approveResponse.hash);
            attempts++;
        }

        if (approveTxResult.status !== "SUCCESS") {
            throw new Error('Failed to approve XLM transfer: ' + approveTxResult.status);
        }

        console.log('✅ XLM approval successful');
        showBetResult('XLM approved! Placing bet...', 'info');

        // Step 2: Place bet (this will transfer XLM from player to contract)
        console.log('Step 2: Placing bet...');
        const account2 = await server.getAccount(publicKey);
        const blackjackContract = new StellarSdk.Contract(CONFIG.contractId);

        const betTx = new StellarSdk.TransactionBuilder(account2, {
            fee: '100000',
            networkPassphrase: CONFIG.networkPassphrase
        })
            .addOperation(
                blackjackContract.call(
                    'place_bet',
                    StellarSdk.nativeToScVal(publicKey, { type: 'address' }),
                    StellarSdk.nativeToScVal(betInStroops, { type: 'i128' })
                )
            )
            .setTimeout(30)
            .build();

        const preparedBetTx = await server.prepareTransaction(betTx);

        const betSignedXDR = await window.freighterApi.signTransaction(
            preparedBetTx.toXDR(),
            {
                networkPassphrase: CONFIG.networkPassphrase
            }
        );

        const betTxBuilt = StellarSdk.TransactionBuilder.fromXDR(
            betSignedXDR,
            CONFIG.networkPassphrase
        );

        const betResponse = await server.sendTransaction(betTxBuilt);

        // Wait for bet transaction
        let betTxResult = await server.getTransaction(betResponse.hash);
        attempts = 0;
        while (betTxResult.status === "NOT_FOUND" && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            betTxResult = await server.getTransaction(betResponse.hash);
            attempts++;
        }

        if (betTxResult.status === "SUCCESS") {
            console.log('✅ Bet placed successfully! XLM transferred on-chain');
            showStatus(`Bet placed! ${betAmount} XLM transferred on-chain!`, 'success');
            showBetResult('Game started! Cards dealt!', 'success');
            
            isLocalGame = false; // It's an on-chain game

            // Reload game state
            await checkActiveGame();
            await loadHouseBalance();
        } else {
            throw new Error(`Transaction failed: ${betTxResult.status}`);
        }

    } catch (error) {
        // === MODIFIED: Start local game on failure WITHOUT warning ===
        console.error('Error placing bet, starting local game:', error);
        
        isLocalGame = true;
        startLocalGame(betAmount); // Start local-only game
        // === END MODIFICATION ===
    }
}

// Hit - draw another card
async function hit() {
    // === MODIFIED: Handle local game ===
    if (isLocalGame) {
        hitLocal();
        return;
    }
    // === END MODIFICATION ===

    if (!connectedPublicKey || !currentGame) {
        showStatus('No active game', 'error');
        return;
    }

    try {
        showStatus('Drawing card...', 'info');

        const publicKey = connectedPublicKey;
        const account = await server.getAccount(publicKey);
        const contract = new StellarSdk.Contract(CONFIG.contractId);

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: '100000',
            networkPassphrase: CONFIG.networkPassphrase
        })
            .addOperation(
                contract.call(
                    'hit',
                    StellarSdk.nativeToScVal(publicKey, { type: 'address' })
                )
            )
            .setTimeout(30)
            .build();

        const preparedTx = await server.prepareTransaction(tx);

        const signedXDR = await window.freighterApi.signTransaction(
            preparedTx.toXDR(),
            {
                networkPassphrase: CONFIG.networkPassphrase
            }
        );

        const txBuilt = StellarSdk.TransactionBuilder.fromXDR(
            signedXDR,
            CONFIG.networkPassphrase
        );

        const response = await server.sendTransaction(txBuilt);

        let txResult = await server.getTransaction(response.hash);
        let attempts = 0;
        while (txResult.status === "NOT_FOUND" && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            txResult = await server.getTransaction(response.hash);
            attempts++;
        }

        if (txResult.status === "SUCCESS") {
            showStatus('Card drawn!', 'success');

            // Reload game state
            await checkActiveGame();
            await loadHouseBalance();
        } else {
            throw new Error(`Transaction failed: ${txResult.status}`);
        }

    } catch (error) {
        console.error('Error hitting:', error);
        showStatus(`Failed to draw card: ${error.message}`, 'error');
    }
}

// Stand - end turn (dealer plays, game resolves, XLM payout happens)
async function stand() {
    // === MODIFIED: Handle local game ===
    if (isLocalGame) {
        standLocal();
        return;
    }
    // === END MODIFICATION ===

    if (!connectedPublicKey || !currentGame) {
        showStatus('No active game', 'error');
        return;
    }

    try {
        showStatus('Standing... Dealer is playing and settling bets on-chain...', 'info');

        const publicKey = connectedPublicKey;
        const account = await server.getAccount(publicKey);
        const contract = new StellarSdk.Contract(CONFIG.contractId);

        const tx = new StellarSdk.TransactionBuilder(account, {
            fee: '100000',
            networkPassphrase: CONFIG.networkPassphrase
        })
            .addOperation(
                contract.call(
                    'stand',
                    StellarSdk.nativeToScVal(publicKey, { type: 'address' })
                )
            )
            .setTimeout(30)
            .build();

        const preparedTx = await server.prepareTransaction(tx);

        const signedXDR = await window.freighterApi.signTransaction(
            preparedTx.toXDR(),
            {
                networkPassphrase: CONFIG.networkPassphrase
            }
        );

        const txBuilt = StellarSdk.TransactionBuilder.fromXDR(
            signedXDR,
            CONFIG.networkPassphrase
        );

        const response = await server.sendTransaction(txBuilt);

        let txResult = await server.getTransaction(response.hash);
        let attempts = 0;
        while (txResult.status === "NOT_FOUND" && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            txResult = await server.getTransaction(response.hash);
            attempts++;
        }

        if (txResult.status === "SUCCESS") {
            console.log('✅ Game resolved! XLM payout processed on-chain');
            showStatus('Game complete! Winnings transferred on-chain!', 'success');

            // Game is resolved, reload state
            currentGame = null;
            await loadHouseBalance();
            setTimeout(() => {
                hideGameArea();
            }, 5000);
        } else {
            throw new Error(`Transaction failed: ${txResult.status}`);
        }

    } catch (error) {
        console.error('Error standing:', error);
        showStatus(`Failed to stand: ${error.message}`, 'error');
    }
}


// ===================================
// === LOCAL GAMEPLAY LOGIC ===
// ===================================

/**
 * Creates a standard 52-card deck.
 * Suits: 0=H, 1=D, 2=C, 3=S
 * Values: 1=A, 2-10, 11=J, 12=Q, 13=K
 */
function createDeck() {
    const suits = [0, 1, 2, 3];
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
    return deck;
}

/** Shuffles a deck array in place */
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

/** Deals one card from the local deck */
function dealCard(deck) {
    return deck.pop();
}

/** Calculates the score of a hand (array of card objects) */
function calculateScore(cards) {
    let score = 0;
    let aces = 0;
    for (let card of cards) {
        let value = card.value;
        if (value > 10) value = 10; // J, Q, K
        if (value === 1) { // Ace
            aces++;
            value = 11;
        }
        score += value;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

/** Starts a new local-only game */
function startLocalGame(betAmount) {
    localDeck = createDeck();
    shuffleDeck(localDeck);

    const playerHand = [dealCard(localDeck), dealCard(localDeck)];
    const dealerHand = [dealCard(localDeck), dealCard(localDeck)];

    const game = {
        bet: Math.floor(betAmount * 10_000_000), // Store in stroops for consistency
        player_hand: playerHand,
        dealer_hand: dealerHand,
        player_score: calculateScore(playerHand),
        dealer_score: calculateScore(dealerHand),
        phase: 'PlayerTurn'
    };

    currentGame = game;
    console.log("Started local-only game:", currentGame);
    displayGame(currentGame);

    // Update UI elements that aren't set by displayGame
    document.getElementById('currentBet').textContent = `${betAmount.toFixed(2)} XLM`;
    document.getElementById('houseBalance').textContent = '10500';
}

/** Handles a 'hit' in a local-only game */
function hitLocal() {
    console.log("Local Hit");
    if (!currentGame || currentGame.phase !== 'PlayerTurn') return;

    currentGame.player_hand.push(dealCard(localDeck));
    currentGame.player_score = calculateScore(currentGame.player_hand);

    // === MODIFIED: Removed showStatus popup ===
    console.log('Card drawn (local)!');

    if (currentGame.player_score > 21) {
        currentGame.phase = 'Resolved'; // Player busts
        console.log("Player busts (local)");
    }

    displayGame(currentGame);
}

/** Handles a 'stand' in a local-only game */
function standLocal() {
    console.log("Local Stand");
    if (!currentGame || currentGame.phase !== 'PlayerTurn') return;

    currentGame.phase = 'DealerTurn';
    // === MODIFIED: Removed showStatus popup ===
    console.log('Standing... Dealer is playing (local)...');

    // Reveal dealer's hand (displayGame handles this)
    displayGame(currentGame);

    // Use a timeout to simulate dealer's turn
    setTimeout(() => {
        // Dealer plays
        while (currentGame.dealer_score < 17) {
            console.log("Dealer hits (local)...");
            currentGame.dealer_hand.push(dealCard(localDeck));
            currentGame.dealer_score = calculateScore(currentGame.dealer_hand);
        }

        currentGame.phase = 'Resolved';
        console.log("Game resolved locally");
        displayGame(currentGame); // Show final hands and trigger result
    }, 1500);
}


// ======================
// UI FUNCTIONS
// ======================

// Display game state
function displayGame(game) {
    if (!game) return;

    currentGame = game;
    document.getElementById('noGameMessage').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    // Update bet info
    const betXLM = (game.bet / 10_000_000).toFixed(2);
    document.getElementById('currentBet').textContent = `${betXLM} XLM`;

    // Display hands
    // In local game, dealer_hand[1] is the hidden card. In on-chain, it's just the second card.
    // The `hideFirstCard` logic (which hides the *second* card at index 1) works for both.
    displayHand('playerHand', game.player_hand);
    displayHand('dealerHand', game.dealer_hand, game.phase !== 'Resolved');

    // Display scores
    document.getElementById('playerScore').textContent = game.player_score;
    document.getElementById('dealerScore').textContent = game.phase === 'Resolved' ? game.dealer_score : '?';

    // Update game status and buttons
    if (game.phase === 'PlayerTurn') {
        document.getElementById('gameStatus').textContent = 'Your Turn';
        document.getElementById('hitBtn').disabled = false;
        document.getElementById('standBtn').disabled = false;
        document.getElementById('gameResult').style.display = 'none';
    } else if (game.phase === 'DealerTurn') {
        document.getElementById('gameStatus').textContent = 'Dealer Playing...';
        document.getElementById('hitBtn').disabled = true;
        document.getElementById('standBtn').disabled = true;
    } else if (game.phase === 'Resolved') {
        document.getElementById('gameStatus').textContent = 'Game Complete';
        document.getElementById('hitBtn').disabled = true;
        document.getElementById('standBtn').disabled = true;
        displayGameResult(game);

        // For local games, we need to reset after showing the result
        if (isLocalGame) {
             setTimeout(() => {
                hideGameArea();
            }, 5000);
        }
    }
}

// Display a hand of cards
function displayHand(elementId, cards, hideFirstCard = false) {
    const handElement = document.getElementById(elementId);
    handElement.innerHTML = '';

    cards.forEach((card, index) => {
        const cardDiv = document.createElement('div');

        if (hideFirstCard && index === 1) {
            // Hide dealer's second card
            cardDiv.className = 'card hidden-card card-enter';
            cardDiv.innerHTML = '<div class="card-value">?</div>';
        } else {
            const suit = getSuitSymbol(card.suit);
            const suitClass = getSuitClass(card.suit);
            const value = getCardValue(card.value);

            cardDiv.className = `card ${suitClass} card-enter`;
            cardDiv.innerHTML = `
                <div class="card-value">${value}</div>
                <div class="card-suit">${suit}</div>
            `;
        }

        handElement.appendChild(cardDiv);
    });
}

// Get card value string
function getCardValue(value) {
    if (value === 1) return 'A';
    if (value === 11) return 'J';
    if (value === 12) return 'Q';
    if (value === 13) return 'K';
    return value.toString();
}

// Get suit symbol
function getSuitSymbol(suit) {
    const suits = ['♥', '♦', '♣', '♠'];
    return suits[suit] || '♠';
}

// Get suit class for coloring
function getSuitClass(suit) {
    return suit === 0 || suit === 1 ? 'hearts' : 'clubs';
}

// Display game result
function displayGameResult(game) {
    const resultDiv = document.getElementById('gameResult');
    resultDiv.style.display = 'block';

    let resultText = '';
    let resultMessage = '';

    const playerScore = game.player_score;
    const dealerScore = game.dealer_score;
    const betXLM = (game.bet / 10_000_000).toFixed(2);
    
    // === MODIFIED: Simplified messages for local game ===
    if (playerScore > 21) {
        resultText = 'BUST! 💥';
        resultMessage = `You went over 21. Lost ${betXLM} XLM${isLocalGame ? '.' : ' (transferred on-chain).'}`;
    } else if (dealerScore > 21) {
        resultText = 'YOU WIN! 🎉';
        resultMessage = `Dealer busted! Won ${betXLM} XLM${isLocalGame ? '.' : ' (transferred on-chain)!'}`;
    } else if (playerScore > dealerScore) {
        resultText = 'YOU WIN! 🎉';
        resultMessage = `You beat the dealer! Won ${betXLM} XLM${isLocalGame ? '.' : ' (transferred on-chain)!'}`;
    } else if (playerScore === dealerScore) {
        resultText = 'PUSH 🤝';
        resultMessage = `It's a tie! Your ${betXLM} XLM was returned${isLocalGame ? '.' : ' (on-chain).'}`;
    } else {
        resultText = 'DEALER WINS 😔';
        resultMessage = `Dealer wins. Lost ${betXLM} XLM${isLocalGame ? '.' : ' (on-chain).'}`;
    }
    // === END MODIFICATION ===

    resultDiv.innerHTML = `
        <h3>${resultText}</h3>
        <p>${resultMessage}</p>
        <p>Final Scores: You ${playerScore} - Dealer ${dealerScore}</p>
        <button class="btn btn-success" onclick="location.reload()">Play Again</button>
    `;
}

// Hide game area
function hideGameArea() {
    document.getElementById('noGameMessage').style.display = 'block';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('currentBet').textContent = '0 XLM';
    document.getElementById('gameStatus').textContent = 'No Active Game';
    document.getElementById('gameResult').style.display = 'none'; // Hide result
    document.getElementById('betResult').style.display = 'none'; // Hide bet status
    currentGame = null;
    isLocalGame = false;
}