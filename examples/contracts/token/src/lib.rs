#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Balance(Address),
    Admin,
    Initialized,
}

#[contract]
pub struct SandboxToken;

#[contractimpl]
impl SandboxToken {
    pub fn init(env: Env, admin: Address, amount: i128) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("token is already initialized");
        }
        if amount < 0 {
            panic!("initial amount cannot be negative");
        }

        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Self::set_balance(&env, &admin, amount);
        env.storage().instance().set(&DataKey::Initialized, &true);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        if amount <= 0 {
            panic!("transfer amount must be positive");
        }

        from.require_auth();
        let from_balance = Self::balance(env.clone(), from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }

        Self::set_balance(&env, &from, from_balance - amount);
        let to_balance = Self::balance(env.clone(), to.clone());
        Self::set_balance(&env, &to, to_balance + amount);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    fn set_balance(env: &Env, id: &Address, amount: i128) {
        env.storage()
            .instance()
            .set(&DataKey::Balance(id.clone()), &amount);
    }
}

#[cfg(test)]
mod test {
    use super::SandboxTokenClient;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn authorized_transfer_updates_both_balances() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, super::SandboxToken);
        let client = SandboxTokenClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.init(&alice, &1_000);
        client.transfer(&alice, &bob, &125);

        assert_eq!(client.balance(&alice), 875);
        assert_eq!(client.balance(&bob), 125);
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn transfer_rejects_insufficient_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, super::SandboxToken);
        let client = SandboxTokenClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.init(&alice, &100);
        client.transfer(&alice, &bob, &101);
    }
}
