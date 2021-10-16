<template>
  <div class="util">
    <p>This code was executed in </p>
    <get-runtime-platform />
      <suspense>
    <get-usd-rate /> 
  </suspense>USD per BCH
  
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
