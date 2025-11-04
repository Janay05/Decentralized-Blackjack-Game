import React from 'react';
import { TrendingUp, TrendingDown, User, DollarSign } from 'lucide-react';

export const StatsBar = ({ stats }) => {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-green-700 bg-opacity-50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-green-200">Wins</div>
            <div className="text-2xl font-bold">{stats.wins}</div>
          </div>
          <TrendingUp className="text-green-300" size={32} />
        </div>
      </div>
      
      <div className="bg-red-700 bg-opacity-50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-red-200">Losses</div>
            <div className="text-2xl font-bold">{stats.losses}</div>
          </div>
          <TrendingDown className="text-red-300" size={32} />
        </div>
      </div>
      
      <div className="bg-blue-700 bg-opacity-50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-200">Pushes</div>
            <div className="text-2xl font-bold">{stats.pushes}</div>
          </div>
          <User className="text-blue-300" size={32} />
        </div>
      </div>
      
      <div className="bg-yellow-700 bg-opacity-50 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-yellow-200">Total Wagered</div>
            <div className="text-2xl font-bold">{stats.totalWagered} XLM</div>
          </div>
          <DollarSign className="text-yellow-300" size={32} />
        </div>
      </div>
    </div>
  );
};