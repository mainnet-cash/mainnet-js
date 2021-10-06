<template>
  <div class="util">
    <h1>Loaded from</h1>
    <get-runtime-platform />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import GetRuntimePlatform from "@/components/GetRuntimePlatform.vue";

export default defineComponent({
  name: "Util",
  components: {
    GetRuntimePlatform,
  },
});
</script>
