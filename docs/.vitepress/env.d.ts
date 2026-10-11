declare module 'virtual:playground-types' {
  const files: Record<string, string>
  export default files
}

declare module '*.vue' {
  import {type DefineComponent} from 'vue'
  const component: DefineComponent
  export default component
}
