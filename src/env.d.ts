/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'expr-eval' {
  export class Parser {
    constructor(options?: any)
    parse(expression: string): Expression
  }
  interface Expression {
    evaluate(variables: Record<string, number>): number
    variables(): () => string[]
    simplify(options?: any): Expression
    toString(): string
  }
}

declare module 'jsqr' {
  interface QRCode {
    data: string
    location?: any
  }
  export default function jsqr(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): QRCode | null
}
