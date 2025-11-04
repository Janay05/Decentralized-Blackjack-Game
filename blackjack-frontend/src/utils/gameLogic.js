export const calculateHandValue = (hand) => {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.value === 'A') {
      aces += 1;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      value += 10;
    } else {
      value += parseInt(card.value);
    }
  }

  // Add aces
  for (let i = 0; i < aces; i++) {
    if (value + 11 <= 21) {
      value += 11;
    } else {
      value += 1;
    }
  }

  return value;
};

export const getCardDisplay = (card) => {
  return card.value;
};

export const getCardSuit = (card) => {
  return card.suit;
};

export const isRedSuit = (suit) => {
  return suit === '♥' || suit === '♦';
};