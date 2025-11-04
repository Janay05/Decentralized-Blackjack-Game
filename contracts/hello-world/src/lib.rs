#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, token, Address, Env, Vec,
};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum BlackjackError {
    GameAlreadyExists = 1,
    NoGameExists = 2,
    InvalidBet = 3,
    NotPlayerTurn = 4,
    NotDealerTurn = 5,
    GameNotResolved = 6,
    Unauthorized = 7,
    InvalidPhase = 8,
    InsufficientFunds = 9,
    InvalidAmount = 10,
}

impl From<BlackjackError> for soroban_sdk::Error {
    fn from(e: BlackjackError) -> Self {
        Self::from_contract_error(e as u32)
    }
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Card {
    value: u32, // 1-13 (Ace = 1, Jack = 11, Queen = 12, King = 13)
    suit: u32,  // 0-3 (Hearts, Diamonds, Clubs, Spades)
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum GamePhase {
    Betting,
    PlayerTurn,
    DealerTurn,
    Resolved,
}

#[derive(Clone)]
#[contracttype]
pub struct Game {
    player: Address,
    token: Address,
    bet: i128,
    player_hand: Vec<Card>,
    dealer_hand: Vec<Card>,
    phase: GamePhase,
}

#[contracttype]
pub enum DataKey {
    Game,
    Owner,
    Token,
}

#[contract]
pub struct BlackjackContract;

#[contractimpl]
impl BlackjackContract {
    pub fn initialize(env: Env, owner: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic_with_error!(&env, BlackjackError::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Token, &token);
    }

    // Fund the contract (owner or anyone can fund)
    pub fn fund_contract(env: Env, from: Address, amount: i128) {
        from.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, BlackjackError::InvalidAmount);
        }

        let token = env.storage().instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap_or_else(|| panic_with_error!(&env, BlackjackError::Unauthorized));
        let token_client = token::Client::new(&env, &token);

        // Transfer tokens from sender to contract
        token_client.transfer(&from, &env.current_contract_address(), &amount);
    }

    // Claim funds from contract (owner only)
    pub fn claim_funds(env: Env, amount: i128) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, BlackjackError::InvalidAmount);
        }

        let token = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap();
        let token_client = token::Client::new(&env, &token);

        // Check contract balance
        let contract_balance = token_client.balance(&env.current_contract_address());
        if contract_balance < amount {
            panic_with_error!(&env, BlackjackError::InsufficientFunds);
        }

        // Transfer tokens from contract to owner
        token_client.transfer(&env.current_contract_address(), &owner, &amount);
    }

    // Get contract balance
    pub fn get_contract_balance(env: Env) -> i128 {
        let token = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap();
        let token_client = token::Client::new(&env, &token);
        token_client.balance(&env.current_contract_address())
    }

    // Get owner address
    pub fn get_owner(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }

    pub fn bet_and_deal(env: Env, player: Address, bet: i128) -> Game {
        // IMPORTANT: Require player authorization for the bet transfer
        player.require_auth();

        // Check if a game already exists
        if env.storage().instance().has(&DataKey::Game) {
            panic_with_error!(&env, BlackjackError::GameAlreadyExists);
        }

        // Validate bet amount
        if bet <= 0 {
            panic_with_error!(&env, BlackjackError::InvalidBet);
        }

        // Get token client and check if contract has enough balance for potential payout
        let token = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap();
        let token_client = token::Client::new(&env, &token);
        let contract_balance = token_client.balance(&env.current_contract_address());

        // Contract needs at least 2x the bet to cover potential payout
        if contract_balance < bet * 2 {
            panic_with_error!(&env, BlackjackError::InsufficientFunds);
        }

        // Transfer bet from player to contract
        token_client.transfer(&player, &env.current_contract_address(), &bet);

        // Create new game
        let mut game = Game {
            player,
            token,
            bet,
            player_hand: Vec::new(&env),
            dealer_hand: Vec::new(&env),
            phase: GamePhase::Betting,
        };

        // Deal initial cards
        game.player_hand.push_back(Self::deal_card(&env));
        game.dealer_hand.push_back(Self::deal_card(&env));
        game.player_hand.push_back(Self::deal_card(&env));
        game.dealer_hand.push_back(Self::deal_card(&env));
        game.phase = GamePhase::PlayerTurn;

        // Save game state
        Self::write_game(&env, &game);
        game
    }

    pub fn hit(env: Env) -> Game {
        let mut game = Self::read_game(&env);
        if game.phase != GamePhase::PlayerTurn {
            panic_with_error!(&env, BlackjackError::NotPlayerTurn);
        }

        // Deal a card to player
        game.player_hand.push_back(Self::deal_card(&env));

        // Check if player busts
        if Self::get_hand_value(&game.player_hand) > 21 {
            Self::resolve_game(&env, &mut game);
        } else {
            Self::write_game(&env, &game);
        }
        game
    }

    pub fn stand(env: Env) -> Game {
        let mut game = Self::read_game(&env);
        if game.phase != GamePhase::PlayerTurn {
            panic_with_error!(&env, BlackjackError::NotPlayerTurn);
        }

        game.phase = GamePhase::DealerTurn;

        // Dealer hits until 17 or higher
        while Self::get_hand_value(&game.dealer_hand) < 17 {
            game.dealer_hand.push_back(Self::deal_card(&env));
        }

        Self::resolve_game(&env, &mut game);
        game
    }

    // Helper functions
    fn deal_card(env: &Env) -> Card {
        let value = (env.prng().gen::<u64>() % 13 + 1) as u32;
        let suit = (env.prng().gen::<u64>() % 4) as u32;
        Card { value, suit }
    }

    fn get_hand_value(hand: &Vec<Card>) -> u32 {
        let mut value = 0u32;
        let mut aces = 0u32;

        for card in hand.iter() {
            match card.value {
                1 => {
                    aces += 1;
                    value += 11;
                }
                11..=13 => value += 10,
                _ => value += card.value,
            }
        }

        // Adjust for aces
        while value > 21 && aces > 0 {
            value -= 10;
            aces -= 1;
        }

        value
    }

    fn read_game(env: &Env) -> Game {
        env.storage()
            .instance()
            .get(&DataKey::Game)
            .unwrap_or_else(|| panic_with_error!(env, BlackjackError::NoGameExists))
    }

    fn write_game(env: &Env, game: &Game) {
        env.storage().instance().set(&DataKey::Game, game);
        env.storage().instance().extend_ttl(1000, 1000);
    }

    fn delete_game(env: &Env) {
        env.storage().instance().remove(&DataKey::Game);
    }

    fn resolve_game(env: &Env, game: &mut Game) {
        let player_value = Self::get_hand_value(&game.player_hand);
        let dealer_value = Self::get_hand_value(&game.dealer_hand);
        let token_client = token::Client::new(&env, &game.token);

        let payout = if player_value > 21 {
            // Player busts - house wins
            0
        } else if dealer_value > 21 || player_value > dealer_value {
            // Player wins - pay 2:1
            game.bet * 2
        } else if player_value == dealer_value {
            // Push - return bet
            game.bet
        } else {
            // House wins
            0
        };

        if payout > 0 {
            token_client.transfer(&env.current_contract_address(), &game.player, &payout);
        }

        game.phase = GamePhase::Resolved;
        Self::delete_game(env);
    }
}
