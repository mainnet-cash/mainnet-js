<template>
    <el-container id="nav">
      <el-header>Mainnet-js demo</el-header>
      <el-container>
        <el-aside width="200px">  
               <el-menu
        default-active="2"
      >  
      <el-menu-item>
          <router-link to="/">Home</router-link> 
      </el-menu-item>
      <el-menu-item>
          <router-link to="/util">Util</router-link> 
      </el-menu-item>
      <el-menu-item>
          <router-link to="/Wallet">Wallet</router-link>
      </el-menu-item>
               </el-menu>
        </el-aside>
        <el-main>
          
          <router-view />
          
        </el-main>
      </el-container>
    </el-container>
  
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
