// Fix for GSAP Draggable casing issue
// The GSAP package has Draggable.js (uppercase) but draggable.d.ts (lowercase)
// This causes TypeScript errors on case-sensitive file systems

declare module "gsap/Draggable" {
  import { Draggable } from "gsap";
  export { Draggable };
  export default Draggable;
}
