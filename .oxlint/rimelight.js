import {definePlugin} from "oxlint"
import {componentPropsStandard} from "./rules/componentPropsStandard.js"
import {componentEmitsStandard} from "./rules/componentEmitsStandard.js"
import {preferValidatedGetters} from "./rules/preferValidatedGetters.js"
import {iconifyStandardFormat} from "./rules/iconifyStandardFormat.js"
import {vueScriptRegions} from "./rules/vueScriptRegions.js"

export default definePlugin({
  meta: {
    name: "rimelight"
  },
  rules: {
    "component-props-standard": componentPropsStandard,
    "component-emits-standard": componentEmitsStandard,
    "prefer-validated-getters": preferValidatedGetters,
    "iconify-standard-format": iconifyStandardFormat,
    "vue-script-regions": vueScriptRegions
  }
})
