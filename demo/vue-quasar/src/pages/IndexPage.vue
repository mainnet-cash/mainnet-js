<script setup lang="ts">
import { Wallet } from 'mainnet-js';
import { useStore } from 'src/stores/store';
import { defineCustomElements } from '@bitjson/qr-code';
import InfoDialog from 'src/components/infoDialog.vue';
import { ref } from 'vue';

defineCustomElements(window);

const store = useStore();

store.wallet = await Wallet.newRandom();
const address = store.wallet.getDepositAddress();
const showDialog = ref(false);

</script>

<template>
  <div class="mt-20 flex flex-col items-center justify-center">
    <span class="text-xl">mainnet-js demo</span>
    <span>quasar + vite + rollup + vue3 + tailwindcss</span>
    <qr-code @click="() => showDialog = true" :contents="address" class="w-[230px] h-[230px] m-5 bg-white cursor-pointer">
      <img src="favicon.ico" slot="icon" /> <!-- eslint-disable-line -->
    </qr-code>
    <span>{{ address }}</span>
    <div v-if="showDialog">
      <InfoDialog title="Dialog demo" text="Dialog body text" close-button @close="() => showDialog = false"/>
    </div>
  </div>
</template>
