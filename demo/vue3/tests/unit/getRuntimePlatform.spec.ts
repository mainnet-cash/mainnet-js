import { shallowMount } from "@vue/test-utils";
import GetRuntimePlatform from "@/components/GetRuntimePlatform.vue";

describe("GetRuntimePlatform.vue", () => {
  it("renders runtime platform when passed", () => {
    const msg = "browser";
    const wrapper = shallowMount(GetRuntimePlatform, {
      props: { msg },
    });
    expect(wrapper.text()).toMatch(msg);
  });
});
