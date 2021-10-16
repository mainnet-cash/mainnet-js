<template>
  <div class="wallet">
    <el-row>
    <el-radio-group v-model="network">
      <el-radio-button label="mainnet"></el-radio-button>
      <el-radio-button label="testnet"></el-radio-button>
    </el-radio-group>
    </el-row>
    <el-row>
     <el-radio-group v-model="type">
      <el-radio-button label="seed"></el-radio-button>
      <el-radio-button label="wif"></el-radio-button>
    </el-radio-group>
    </el-row>
    <el-row>
      <el-button @click="generate">Generate </el-button>
    </el-row>
    <el-row>
    <suspense>
    <p >walletId: {{ wallet }}</p>
    </suspense>
    </el-row>
    <suspence>
          <el-row v-if="wallet.cashaddr">
      <p >balance: {{ balance }}</p>
    </el-row >
    </suspence>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { Wallet, TestNetWallet, RegTestWallet, createWallet, walletFromId, WalletRequestI } from "mainnet-js";
import { create } from "domain";
export default defineComponent({
  name: "wallet",

  props:{
    id: String
  },

  async data(props){
    let wallet = {}
     if(props.id!){
      wallet = await walletFromId(props.id)
    }
    return {
      network: ref('mainnet'),
      type: ref('seed'),
      wallet: wallet,
      balance: NaN
    }
  },

  methods: {
    async generate() {
      // `this` inside methods points to the current active instance
      let req = {type: this.type, network:this.network} as WalletRequestI
      let w = await createWallet(req)
      this.wallet = w
      this.updateBalance()
    },
    async updateBalance() {
      // `this` inside methods points to the current active instance
      let resp = (await (this.wallet as Wallet).getBalance('sat'))
      this.balance = resp as number
    },

  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
