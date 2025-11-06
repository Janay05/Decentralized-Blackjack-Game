#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, Address, Env, Vec,
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
    AlreadyInitialized = 11,
}

impl From<BlackjackError> for soroban_sdk::Error {
    fn from(e: BlackjackError) -> Self {
        Self::from_contract_error(e as u32)
    }
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Card {
    pub value: u32, // 1-13 (Ace = 1, Jack = 11, Queen = 12, King = 13)
    pub suit: u32,  // 0-3 (Hearts, Diamonds, Clubs, Spades)
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum GamePhase {
    PlayerTurn,
    DealerTurn,
    Resolved,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct GameState {
    pub player: Address,
    pub bet: i128,
    pub player_hand: Vec<Card>,
    pub dealer_hand: Vec<Card>,
    pub phase: GamePhase,
    pub player_score: u32,
    pub dealer_score: u32,
}

#[contracttype]
pub enum DataKey {
    Game(Address),  // Store game per player address
    Owner,
    HouseBalance,
}

#[contract]
pub struct BlackjackContract;

#[contractimpl]
impl BlackjackContract {
    /// Initialize the contract with an owner
    pub fn initialize(env: Env, owner: Address) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic_with_error!(&env, BlackjackError::AlreadyInitialized);
        }
        
        owner.require_auth();
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::HouseBalance, &0i128);
    }

    /// Owner deposits XLM to fund the house bankroll
    pub fn deposit_house_funds(env: Env, amount: i128) {
        let owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .unwrap_or_else(|| panic_with_error!(&env, BlackjackError::Unauthorized));
        
        owner.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, BlackjackError::InvalidAmount);
        }

        let current_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::HouseBalance)
            .unwrap_or(0);
        
        let new_balance = current_balance + amount;
        env.storage().instance().set(&DataKey::HouseBalance, &new_balance);
    }

    /// Owner withdraws XLM from the house bankroll
    pub fn withdraw_house_funds(env: Env, amount: i128) {
        let owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .unwrap_or_else(|| panic_with_error!(&env, BlackjackError::Unauthorized));
        
        owner.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, BlackjackError::InvalidAmount);
        }

        let current_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::HouseBalance)
            .unwrap_or(0);

        if current_balance < amount {
            panic_with_error!(&env, BlackjackError::InsufficientFunds);
        }

        let new_balance = current_balance - amount;
        env.storage().instance().set(&DataKey::HouseBalance, &new_balance);
    }

    /// Get the current house balance
    pub fn get_house_balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::HouseBalance)
            .unwrap_or(0)
    }

    /// Get the owner address
    pub fn get_owner(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Owner)
            .unwrap_or_else(|| panic_with_error!(&env, BlackjackError::Unauthorized))
    }

    /// Player places a bet and starts a new game
    pub fn place_bet(env: Env, player: Address, bet: i128) -> GameState {
        player.require_auth();

        // Check if player already has an active game
        let game_key = DataKey::Game(player.clone());
        if env.storage().instance().has(&game_key) {
            panic_with_error!(&env, BlackjackError::GameAlreadyExists);
        }

        // Validate bet amount (minimum 1 XLM = 10_000_000 stroops)
        if bet < 10_000_000 {
            panic_with_error!(&env, BlackjackError::InvalidBet);
        }

        // Check house has enough balance to cover potential payout (2x bet for win)
        let house_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::HouseBalance)
            .unwrap_or(0);

        if house_balance < bet * 2 {
            panic_with_error!(&env, BlackjackError::InsufficientFunds);
        }

        // Deduct bet from house balance (player's bet goes into house)
        // In real implementation, this would transfer XLM from player to contract
        let new_house_balance = house_balance + bet;
        env.storage()
            .instance()
            .set(&DataKey::HouseBalance, &new_house_balance);

        // Create new game and deal initial cards
        let mut player_hand = Vec::new(&env);
        let mut dealer_hand = Vec::new(&env);

        player_hand.push_back(Self::deal_card(&env));
        dealer_hand.push_back(Self::deal_card(&env));
        player_hand.push_back(Self::deal_card(&env));
        dealer_hand.push_back(Self::deal_card(&env));

        let player_score = Self::calculate_hand_value(&player_hand);
        let dealer_score = Self::calculate_hand_value(&dealer_hand);

        let mut game = GameState {
            player: player.clone(),
            bet,
            player_hand,
            dealer_hand,
            phase: GamePhase::PlayerTurn,
            player_score,
            dealer_score,
        };

        // Check for instant blackjack
        if player_score == 21 || dealer_score == 21 {
            Self::resolve_game(&env, &mut game);
        } else {
            // Save game state
            env.storage().instance().set(&game_key, &game);
            env.storage().instance().extend_ttl(1000, 1000);
        }

        game
    }

    /// Player hits (draws another card)
    pub fn hit(env: Env, player: Address) -> GameState {
        player.require_auth();

        let game_key = DataKey::Game(player.clone());
        let mut game: GameState = env
            .storage()
            .instance()
            .get(&game_key)
            .unwrap_or_else(|| panic_with_error!(&env, BlackjackError::NoGameExists));

        if game.phase != GamePhase::PlayerTurn {
            panic_with_error!(&env, BlackjackError::NotPlayerTurn);
        }

        // Deal a card to player
        let new_card = Self::deal_card(&env);
        game.player_hand.push_back(new_card);
        game.player_score = Self::calculate_hand_value(&game.player_hand);

        // Check if player busts
        if game.player_score > 21 {
            Self::resolve_game(&env, &mut game);
        } else {
            // Save updated game state
            env.storage().instance().set(&game_key, &game);
        }

        game
    }

    /// Player stands (ends their turn)
    pub fn stand(env: Env, player: Address) -> GameState {
        player.require_auth();

        let game_key = DataKey::Game(player.clone());
        let mut game: GameState = env
            .storage()
            .instance()
            .get(&game_key)
            .unwrap_or_else(|| panic_with_error!(&env, BlackjackError::NoGameExists));

        if game.phase != GamePhase::PlayerTurn {
            panic_with_error!(&env, BlackjackError::NotPlayerTurn);
        }

        game.phase = GamePhase::DealerTurn;

        // Dealer hits until 17 or higher
        while game.dealer_score < 17 {
            let new_card = Self::deal_card(&env);
            game.dealer_hand.push_back(new_card);
            game.dealer_score = Self::calculate_hand_value(&game.dealer_hand);
        }

        Self::resolve_game(&env, &mut game);
        game
    }

    /// Get current game state for a player
    pub fn get_game(env: Env, player: Address) -> Option<GameState> {
        let game_key = DataKey::Game(player);
        env.storage().instance().get(&game_key)
    }

    // ============= HELPER FUNCTIONS =============

    fn deal_card(env: &Env) -> Card {
        let value = (env.prng().gen::<u64>() % 13 + 1) as u32;
        let suit = (env.prng().gen::<u64>() % 4) as u32;
        Card { value, suit }
    }

    fn calculate_hand_value(hand: &Vec<Card>) -> u32 {
        let mut value = 0u32;
        let mut aces = 0u32;

        for i in 0..hand.len() {
            let card = hand.get_unchecked(i);
            match card.value {
                1 => {
                    aces += 1;
                    value += 11;
                }
                11..=13 => value += 10, // Face cards
                _ => value += card.value,
            }
        }

        // Adjust for aces (count as 1 instead of 11 if needed)
        while value > 21 && aces > 0 {
            value -= 10;
            aces -= 1;
        }

        value
    }

    fn resolve_game(env: &Env, game: &mut GameState) {
        let player_score = game.player_score;
        let dealer_score = game.dealer_score;

        let mut house_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::HouseBalance)
            .unwrap_or(0);

        let payout = if player_score > 21 {
            // Player busts - house wins, bet already in house
            0
        } else if dealer_score > 21 || player_score > dealer_score {
            // Player wins - return bet + winnings (2:1 payout)
            game.bet * 2
        } else if player_score == dealer_score {
            // Push - return bet only
            game.bet
        } else {
            // Dealer wins - house keeps the bet
            0
        };

        // Update house balance
        if payout > 0 {
            house_balance -= payout;
            env.storage()
                .instance()
                .set(&DataKey::HouseBalance, &house_balance);
        }

        game.phase = GamePhase::Resolved;

        // Remove game from storage
        let game_key = DataKey::Game(game.player.clone());
        env.storage().instance().remove(&game_key);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, BlackjackContract);
        let client = BlackjackContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        client.initialize(&owner);

        assert_eq!(client.get_owner(), owner);
        assert_eq!(client.get_house_balance(), 0);
    }

    #[test]
    fn test_deposit_and_withdraw() {
        let env = Env::default();
        let contract_id = env.register_contract(None, BlackjackContract);
        let client = BlackjackContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        client.initialize(&owner);

        // Deposit funds
        client.deposit_house_funds(&100_000_000); // 10 XLM
        assert_eq!(client.get_house_balance(), 100_000_000);

        // Withdraw funds
        client.withdraw_house_funds(&50_000_000); // 5 XLM
        assert_eq!(client.get_house_balance(), 50_000_000);
    }

    #[test]
    fn test_place_bet() {
        let env = Env::default();
        let contract_id = env.register_contract(None, BlackjackContract);
        let client = BlackjackContractClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let player = Address::generate(&env);

        client.initialize(&owner);
        client.deposit_house_funds(&1_000_000_000); // 100 XLM

        let game = client.place_bet(&player, &50_000_000); // 5 XLM bet

        assert_eq!(game.player, player);
        assert_eq!(game.bet, 50_000_000);
        assert_eq!(game.player_hand.len(), 2);
        assert_eq!(game.dealer_hand.len(), 2);
    }
}
//CBZHMEFJVDBCZ6J4VD32LT6EYH6FILFPFN4IQ42NLYHLAQ6BBIFQYT2I