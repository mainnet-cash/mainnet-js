<script lang="ts">
import { Wallet, BaseWallet, StorageProvider } from "mainnet-js";
import { IndexedDBProvider }from "@mainnet-cash/indexeddb-storage";
import { defineComponent } from "vue";
export default defineComponent({
  name: "wallet",

  data(_props){
    return {
      wallet: null as (Wallet | null),
      image: null as any,
      balance: null as any
    }
  },

  async mounted() {

    BaseWallet.StorageProvider = IndexedDBProvider;
    this.wallet = await Wallet.named("testVueViteWallet");
    this.image = this.wallet.getDepositQr();
    this.balance = await this.wallet.getBalance('BCH');
  },
});

</script>

<template>  
  <header>
    <img
      alt="Vue logo"
      class="logo"
      src="@/assets/logo.svg"
      width="125"
      height="125"
    />

    <div class="wrapper">
      <img v-if="image" :src="image.src" :alt="image.alt" :title="image.title">
      <div v-if="wallet">{{ wallet.cashaddr }}</div>
      <div v-if="balance>=0">{{ balance }} BCH</div>
    </div>
  </header>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
