<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/bch-logo.svg" />
    <HelloWorld msg="mainnet.cash demo" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import HelloWorld from "@/components/HelloWorld.vue"; // @ is an alias to /src

export default defineComponent({
    props: {
    title: String
  },
  name: "Home",
  components: {
    HelloWorld,
  },
});
</script>
