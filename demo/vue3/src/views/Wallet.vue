<template>
  <div class="wallet">
<el-card>
      <suspense>
    <wallet id="wif:regtest:cNfsPtqN2bMRS7vH5qd8tR8GMvgXyL5BjnGAKgZ8DYEiCrCCQcP6" /> 
  </suspense>   
</el-card>
  
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Wallet from "@/components/Wallet.vue";

export default defineComponent({
  name: "Util",
  components: {
    Wallet
  },
});
</script>
