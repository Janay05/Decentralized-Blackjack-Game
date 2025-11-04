import React from 'react';
import { getCardDisplay, getCardSuit, isRedSuit } from '../utils/gameLogic';

export const Card = ({ card, hidden = false }) => {
  if (hidden) {
    return (
      <div className="w-20 h-28 bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg shadow-lg flex items-center justify-center">
        <span className="text-white text-4xl">?</span>
      </div>
    );
  }

  return (
    <div className="w-20 h-28 bg-white rounded-lg shadow-lg flex flex-col items-center justify-between p-2">
      <div className={`text-2xl font-bold ${isRedSuit(card.suit) ? 'text-red-500' : 'text-gray-900'}`}>
        {getCardDisplay(card.value)}
      </div>
      <div className={`text-2xl ${isRedSuit(card.suit) ? 'text-red-500' : 'text-gray-900'}`}>
        {getCardSuit(card.suit)}
      </div>
      <div className={`text-2xl font-bold ${isRedSuit(card.suit) ? 'text-red-500' : 'text-gray-900'}`}>
        {getCardDisplay(card.value)}
      </div>
    </div>
  );
};