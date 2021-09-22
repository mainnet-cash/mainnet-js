<template>
  <div class="about">
    <h1>This is an about page</h1>
    <get-runtime-platform />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
const GetRuntimePlatform = () => import("@/components/GetRuntimePlatform.vue");

export default defineComponent({
  name: "Util",
  components: {
    GetRuntimePlatform,
  },
});
</script>
