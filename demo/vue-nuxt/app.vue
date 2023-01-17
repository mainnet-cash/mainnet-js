<script setup lang="ts">
import { ImageI, Wallet } from "mainnet-js";
const wallet: Wallet = await Wallet.newRandom();
const image: ImageI = wallet.getDepositQr();
</script>

<template>
  <div>
    <img :src="image.src" :alt="image.alt">
    <div>{{ wallet.cashaddr }}</div>
  </div>
</template>
