import { Wallet, TestNetWallet, BalanceResponse } from 'mainnet-js';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useStore = defineStore('counter', () => {
  const wallet = ref(null as (Wallet | TestNetWallet | null));
  const balance = ref(undefined as (BalanceResponse | undefined));

  return { wallet, balance };
});
