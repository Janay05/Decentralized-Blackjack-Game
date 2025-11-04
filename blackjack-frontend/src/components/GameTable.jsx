import React from 'react';
import { Card } from './Card';
import { calculateHandValue } from '../utils/gameLogic';

export const GameTable = ({ 
  playerHand, 
  dealerHand, 
  gamePhase, 
  onHit, 
  onStand, 
  onDeal,
  betAmount,
  setBetAmount,
  isLoading 
}) => {
  return (
    <div className="bg-green-800 bg-opacity-30 backdrop-blur-sm rounded-2xl p-8">
      {/* Dealer Section */}
      <div className="mb-12">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-yellow-400 mb-2">Dealer</div>
          {gamePhase !== 'betting' && (
            <div className="text-xl">
              Score: {gamePhase === 'playing' ? calculateHandValue([dealerHand[0]]) : calculateHandValue(dealerHand)}
            </div>
          )}
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {dealerHand.map((card, idx) => (
            <Card key={idx} card={card} hidden={gamePhase === 'playing' && idx === 1} />
          ))}
        </div>
      </div>

      {/* Game Center */}
      <div className="border-4 border-yellow-600 rounded-xl p-8 mb-8 bg-green-900 bg-opacity-40">
        <div className="text-center text-6xl mb-4">🎰</div>
        <div className="text-center text-xl text-yellow-400">
          {gamePhase === 'betting' && 'Place Your Bet'}
          {gamePhase === 'playing' && 'Hit or Stand?'}
          {gamePhase === 'dealerTurn' && 'Dealer Playing...'}
          {gamePhase === 'resolved' && 'Game Over'}
        </div>
      </div>

      {/* Player Section */}
      <div className="mb-8">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-yellow-400 mb-2">You</div>
          {gamePhase !== 'betting' && (
            <div className="text-xl">Score: {calculateHandValue(playerHand)}</div>
          )}
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {playerHand.map((card, idx) => (
            <Card key={idx} card={card} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 flex-wrap">
        {gamePhase === 'betting' && (
          <>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter bet (multiples of 10)"
              min="10"
              step="10"
              className="bg-green-700 text-white px-6 py-3 rounded-lg text-lg w-64"
              disabled={isLoading}
            />
            <button
              onClick={onDeal}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-lg text-lg disabled:opacity-50"
            >
              Deal Cards
            </button>
          </>
        )}

        {gamePhase === 'playing' && (
          <>
            <button
              onClick={onHit}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 font-bold px-8 py-3 rounded-lg text-lg disabled:opacity-50 text-white"
            >
              Hit
            </button>
            <button
              onClick={onStand}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-500 font-bold px-8 py-3 rounded-lg text-lg disabled:opacity-50 text-white"
            >
              Stand
            </button>
          </>
        )}

        {gamePhase === 'resolved' && (
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-500 font-bold px-8 py-3 rounded-lg text-lg text-white"
          >
            New Game
          </button>
        )}
      </div>
    </div>
  );
};