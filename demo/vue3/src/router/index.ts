import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Home from "../views/Home.vue";
import Util from "../views/Util.vue";
import Wallet from "../views/Wallet.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/util",
    name: "Util",
    component: Util
  },
  {
    path: "/wallet",
    name: "Wallet",
    component: Wallet
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
