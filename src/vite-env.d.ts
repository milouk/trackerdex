/// <reference types="vite/client" />

declare module "*.pgn?raw" {
  const content: string;
  export default content;
}
