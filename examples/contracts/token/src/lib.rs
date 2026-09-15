#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Env, String};

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Balance(String),
    Initialized,
}

#[contract]
pub struct SandboxToken;

#[contractimpl]
impl SandboxToken {
    pub fn init(env: Env, owner: String, amount: i128) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("token is already initialized");
        }
        if amount < 0 {
            panic!("initial amount cannot be negative");
        }

        Self::set_balance(&env, &owner, amount);
        env.storage().instance().set(&DataKey::Initialized, &true);
    }

    pub fn transfer(env: Env, from: String, to: String, amount: i128) {
        if amount <= 0 {
            panic!("transfer amount must be positive");
        }

        let from_balance = Self::balance(env.clone(), from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }

        Self::set_balance(&env, &from, from_balance - amount);
        let to_balance = Self::balance(env.clone(), to.clone());
        Self::set_balance(&env, &to, to_balance + amount);
    }

    pub fn balance(env: Env, id: String) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    fn set_balance(env: &Env, id: &String, amount: i128) {
        env.storage()
            .instance()
            .set(&DataKey::Balance(id.clone()), &amount);
    }
}
