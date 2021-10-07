<template>
  <div class="util">
    <p>This code was executed in </p>
    <get-runtime-platform />
    <p>US Dollars have plummeted to </p>
      <suspense>
    <get-usd-rate />
  </suspense>
  <p> per BCH</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import GetRuntimePlatform from "@/components/GetRuntimePlatform.vue";
import GetUsdRate from "@/components/GetUsdRate.vue";

export default defineComponent({
  name: "Util",
  components: {
    GetRuntimePlatform,
    GetUsdRate
  },
});
</script>
