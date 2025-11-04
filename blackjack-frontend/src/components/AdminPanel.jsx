import React, { useState } from 'react';

export const AdminPanel = ({ contractBalance, onFund, onClaim, isLoading }) => {
  const [fundAmount, setFundAmount] = useState('');
  const [claimAmount, setClaimAmount] = useState('');

  const handleFund = () => {
    if (fundAmount && parseFloat(fundAmount) > 0) {
      onFund(parseFloat(fundAmount));
      setFundAmount('');
    }
  };

  const handleClaim = () => {
    if (claimAmount && parseFloat(claimAmount) > 0) {
      onClaim(parseFloat(claimAmount));
      setClaimAmount('');
    }
  };

  return (
    <div className="bg-purple-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 mb-6">
      <h3 className="text-2xl font-bold mb-4">Admin Panel</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-800 rounded-lg p-4">
          <div className="text-sm text-purple-200 mb-2">Contract Balance</div>
          <div className="text-3xl font-bold">{contractBalance} XLM</div>
        </div>
        
        <div className="bg-purple-800 rounded-lg p-4">
          <label className="block text-sm mb-2">Fund Contract</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 bg-purple-700 rounded px-3 py-2 text-white"
              disabled={isLoading}
            />
            <button 
              onClick={handleFund}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded disabled:opacity-50"
            >
              Fund
            </button>
          </div>
        </div>
        
        <div className="bg-purple-800 rounded-lg p-4">
          <label className="block text-sm mb-2">Claim Funds</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              placeholder="Amount"
              className="flex-1 bg-purple-700 rounded px-3 py-2 text-white"
              disabled={isLoading}
            />
            <button 
              onClick={handleClaim}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded disabled:opacity-50"
            >
              Claim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};