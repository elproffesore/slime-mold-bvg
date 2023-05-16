import { Renderer } from "./view/renderer";
const particleNum = 50000;
document.getElementById("container")?.appendChild(document.createElement("canvas"))
const canvas: HTMLCanvasElement = document.getElementsByTagName("canvas")[0];
canvas.setAttribute("width",window.innerWidth.toString());
canvas.setAttribute("height",window.innerHeight.toString());
canvas.id = "gfx_main";
const renderer = new Renderer(canvas);
async function run(){
    renderer.render(renderer.particlesData,renderer.particles.length);
    requestAnimationFrame(run)
}
(async function(){
    await renderer.initialize(particleNum)
    run()
})();
