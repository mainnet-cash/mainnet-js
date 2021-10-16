<template>
  <div class="platform">
    <p>{{ platform }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Mainnet } from "mainnet-js";
export default defineComponent({
  name: "GetRuntimePlatform",

  setup() {
    
    const platform = Mainnet.getRuntimePlatform();

    // expose to template
    return {
      platform,
    };
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
