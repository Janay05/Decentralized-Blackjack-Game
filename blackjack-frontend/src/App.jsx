import React, { useState, useEffect } from 'react';
import { Wallet, Settings, Loader, DollarSign } from 'lucide-react';
import { StellarService, CONFIG } from './services/stellar';
import { ContractService } from './services/contract';
import { GameTable } from './components/GameTable';
import { StatsBar } from './components/StatsBar';
import { AdminPanel } from './components/AdminPanel';
import { calculateHandValue } from './utils/gameLogic';

function App() {
  console.log('App component rendering');
  
  // // Simple test render to verify styles
  // if (true) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
  //       <div className="text-4xl font-bold">
  //         ♠️ Stellar Blackjack Loading...
  //       </div>
  //     </div>
  //   );
  // }

  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [gamePhase, setGamePhase] = useState('betting');
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [betAmount, setBetAmount] = useState('');
  const [currentBet, setCurrentBet] = useState(0);
  
  const [message, setMessage] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState('');
  
  const [stats, setStats] = useState({ wins: 0, losses: 0, pushes: 0, totalWagered: 0 });

  const stellar = new StellarService();
  const contract = new ContractService();

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      const address = await stellar.connectWallet();
      setWalletAddress(address);
      setIsConnected(true);
      setIsOwner(address === CONFIG.OWNER_ADDRESS);
      
      const bal = await stellar.getBalance(address);
      setBalance(bal);
      
      setMessage('Wallet connected successfully!');
    } catch (error) {
      setMessage('Failed to connect: ' + error.message);
    }
    setIsLoading(false);
  };

  const placeBet = async () => {
    const bet = parseInt(betAmount);
    
    if (!bet || bet <= 0) {
      setMessage('Please enter a valid bet amount');
      return;
    }
    
    if (bet % 10 !== 0) {
      setMessage('Bet amount must be in multiples of 10 XLM');
      return;
    }
    
    if (bet > balance) {
      setMessage('Insufficient balance');
      return;
    }

    setIsLoading(true);
    try {
      const game = await contract.betAndDeal(walletAddress, bet);
      
      setPlayerHand(game.playerHand);
      setDealerHand(game.dealerHand);
      setCurrentBet(bet);
      setGamePhase('playing');
      setMessage('Cards dealt! Make your move.');
      setResultMessage('');
      setResultType('');
      
      setStats(prev => ({ ...prev, totalWagered: prev.totalWagered + bet }));
      
      const newBalance = await stellar.getBalance(walletAddress);
      setBalance(newBalance);
    } catch (error) {
      setMessage('Failed to place bet: ' + error.message);
    }
    setIsLoading(false);
  };

  const hit = async () => {
    setIsLoading(true);
    try {
      const game = await contract.hit(walletAddress);
      
      setPlayerHand(game.playerHand);
      setDealerHand(game.dealerHand);
      
      if (game.phase.tag === 'Resolved') {
        setGamePhase('resolved');
        setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
        setResultMessage(`You Lost ${currentBet} XLM`);
        setResultType('loss');
      }
      
      const newBalance = await stellar.getBalance(walletAddress);
      setBalance(newBalance);
    } catch (error) {
      setMessage('Failed to hit: ' + error.message);
    }
    setIsLoading(false);
  };

  const stand = async () => {
    setIsLoading(true);
    setGamePhase('dealerTurn');
    try {
      const game = await contract.stand(walletAddress);
      
      setPlayerHand(game.playerHand);
      setDealerHand(game.dealerHand);
      setGamePhase('resolved');
      
      const playerScore = calculateHandValue(game.playerHand);
      const dealerScore = calculateHandValue(game.dealerHand);
      
      if (dealerScore > 21 || playerScore > dealerScore) {
        const winAmount = currentBet * 2;
        setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
        setResultMessage(`You Won ${currentBet} XLM! (Total Return: ${winAmount} XLM)`);
        setResultType('win');
      } else if (playerScore === dealerScore) {
        setStats(prev => ({ ...prev, pushes: prev.pushes + 1 }));
        setResultMessage(`Push! Your ${currentBet} XLM bet has been returned.`);
        setResultType('push');
      } else {
        setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
        setResultMessage(`You Lost ${currentBet} XLM`);
        setResultType('loss');
      }
      
      const newBalance = await stellar.getBalance(walletAddress);
      setBalance(newBalance);
    } catch (error) {
      setMessage('Failed to stand: ' + error.message);
    }
    setIsLoading(false);
  };

  const fundContract = async (amount) => {
    setIsLoading(true);
    try {
      await contract.fundContract(walletAddress, amount);
      setMessage(`Successfully funded contract with ${amount} XLM`);
      const newBalance = await stellar.getBalance(walletAddress);
      setBalance(newBalance);
    } catch (error) {
      setMessage('Failed to fund contract: ' + error.message);
    }
    setIsLoading(false);
  };

  const claimFunds = async (amount) => {
    setIsLoading(true);
    try {
      await contract.claimFunds(walletAddress, amount);
      setMessage(`Successfully claimed ${amount} XLM`);
      const newBalance = await stellar.getBalance(walletAddress);
      setBalance(newBalance);
    } catch (error) {
      setMessage('Failed to claim funds: ' + error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white p-4">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-green-800 rounded-lg p-8 flex flex-col items-center gap-4">
            <Loader className="animate-spin" size={48} />
            <div className="text-xl font-bold">Processing Transaction...</div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div className="text-4xl font-bold text-yellow-400">♠️ Stellar Blackjack</div>
          
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <div className="bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
                  <DollarSign size={20} />
                  <span className="font-bold">{balance.toFixed(2)} XLM</span>
                </div>
                <div className="bg-blue-700 px-4 py-2 rounded-lg text-sm">
                  {walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 4)}
                </div>
                {isOwner && (
                  <button
                    onClick={() => setShowAdmin(!showAdmin)}
                    className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <Settings size={20} />
                    Admin
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Wallet size={20} />
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Game Interface */}
        {isConnected && (
          <>
            <StatsBar stats={stats} />
            
            <GameTable
              gamePhase={gamePhase}
              playerHand={playerHand}
              dealerHand={dealerHand}
              currentBet={currentBet}
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              onDeal={placeBet}
              onHit={hit}
              onStand={stand}
              resultMessage={resultMessage}
              resultType={resultType}
            />
            
            {showAdmin && isOwner && (
              <AdminPanel
                contractBalance={contractBalance}
                onFundContract={fundContract}
                onClaimFunds={claimFunds}
              />
            )}
          </>
        )}

        {/* Message Display */}
        {message && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;