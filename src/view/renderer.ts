import shader from './shader/shader.wgsl';
import compute from './shader/compute.wgsl';
import { Particle } from '../model/particle';
import { mat4 } from 'gl-matrix';

export class Renderer{
    canvas: HTMLCanvasElement;
    //device and context
    adapter: GPUAdapter;
    device: GPUDevice ;
    context: GPUCanvasContext ;
    format: GPUTextureFormat;
    //display
    bindGroupLayout: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;
    particleBuffer: GPUBuffer;
    particleVertexBuffer: GPUBuffer;
    //compute
    bindGroupLayoutCompute: GPUBindGroupLayout;
    bindGroupCompute: GPUBindGroup;
    //pipelines
    renderPipeline: GPURenderPipeline;
    computePipeline: GPUComputePipeline;
    //assets
    simulationParamsBuffer: GPUBuffer;
    particlesData: Float32Array;
    particles: Particle[] = []; 
    particleNum: number;
    deltaT: number;

    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;
        this.deltaT = 0;
    }
    async initialize(size:number){
        await this.setupDevice();
        this.particleNum = size;
        this.createVertex();
        this.createData();
        this.makePipeline();
        this.render(this.particlesData,this.particles.length)
    }
    async setupDevice(){
        this.adapter = <GPUAdapter> await navigator.gpu.requestAdapter();
        this.device= <GPUDevice> await this.adapter.requestDevice();
        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format= <GPUTextureFormat>"bgra8unorm";
        this.context.configure({
            device:this.device,
            format:this.format
        })
    }
    createData(){
        this.particlesData = new Float32Array(8*this.particleNum) //12 values -> particle number
        let radDiv = (2 * Math.PI) / this.particleNum
        for(let i = 0; i < this.particleNum; i++){
            let randomW = Math.random() * Math.PI * 2; 
            let randomR = -1 + Math.random() * 1;
            let x = randomR * Math.cos(randomW);
            let y = randomR * Math.sin(randomW);
            let randomX = 1 * Math.cos(Math.random()*Math.PI*2);
            let randomY = 1 * Math.sin(Math.random()*Math.PI*2);
            let particle = new Particle([x,y,0],[0,randomY,randomX])
            this.particles.push(particle)
            let array = particle.toFloatArray();
            for(let j = 0;j < array.length;j++){
                this.particlesData[8*i+j] = <number> array[j];
            }
        }
    }
    createVertex(){
        const particleVertex: Float32Array = new Float32Array([
            0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
        ])
        this.particleVertexBuffer = this.device.createBuffer({
            size: particleVertex.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        // information that will be used by the buffer to create right buffer
        new Float32Array(this.particleVertexBuffer.getMappedRange()).set(particleVertex);
        this.particleVertexBuffer.unmap(); // remove it from write mode
    }
    makePipeline(){
        //create buffers
        let particleBufferSize = 
            3 * 4 + // position
            3 * 4 + // velocity
            2 * 4   // padding
        let simulationParamsBufferSize = 
            1 * 4 + // deltaT
            3 * 4   // padding
        this.particleBuffer = this.device.createBuffer({
            size: this.particleNum * particleBufferSize, //16 float á 4 Byte
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        }) 
        this.simulationParamsBuffer = this.device.createBuffer({
            size: simulationParamsBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        }) 
        this.computePipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({
                    code: compute
                }),
                entryPoint: "cs_main"
            }

        })
        this.bindGroupCompute  = this.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.particleBuffer,
                    offset: 0,
                    size: this.particleNum * particleBufferSize
                }
            },{
                binding: 1,
                resource: {
                    buffer: this.simulationParamsBuffer
                }
            }]
        })
        //create bindgroup layout where buffer(s) will be stored 
        this.bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer:{
                        type: "read-only-storage",
                        hasDynamicOffset: false
                    }
                }
            ]
        })
        //create bindgroup matching layout and attach buffer at specific location (0)
        this.bindGroup = this.device.createBindGroup({
            layout: this.bindGroupLayout,
            entries: [
            {
                binding: 0,
                resource: {
                    buffer: this.particleBuffer
                }
            }]
        });
        //create pipeline layout and attach the bindgrouplayout
        const pipelineLayout: GPUPipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.bindGroupLayout]
        })
        //create pipeline and attach the vertex and fragment shaders
        this.renderPipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: this.device.createShaderModule({
                    code: shader
                }), //mapping .wgsl file
                entryPoint: "vs_main",
                buffers: [
                    {
                        arrayStride: 32,
                        attributes: [
                            {
                                shaderLocation: 0, //position
                                format: "float32x3",
                                offset: 0
                            },{
                                shaderLocation: 1, //velocity
                                format: "float32x3",
                                offset: 12
                            }
                        ]

                    }
                ]
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: shader
                }), //mapping .wgsl file
                entryPoint : "fs_main", //function which should be called in that stage
                targets: [{ // fragment shader target format
                    format: this.format //color fragment format is predefined 
                }]
            },
            primitive : {
                topology: "point-list",
            }
        });
    }
    render = (objects: Float32Array,objectCount: number) => {   
        this.deltaT += 1;    
        //create matrixes for the different transformation
        const projection = mat4.create();
        mat4.perspective(projection, Math.PI / 4, window.innerWidth / window.innerWidth, 0.1, 10);
        
                const view = mat4.create();
                mat4.lookAt(view, [-2, 0, 0], [0, 0, 0], [0, 0, 1]);
        //write the matrixes to the buffer which was bound at group(0)
        this.device.queue.writeBuffer(this.simulationParamsBuffer,0,new Float32Array([this.deltaT]))
        this.device.queue.writeBuffer(this.particleBuffer, 0, objects ,0, objects.length);
        const commandEncoder: GPUCommandEncoder = <GPUCommandEncoder>this.device.createCommandEncoder();

        const computePass: GPUComputePassEncoder = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0,this.bindGroupCompute);
        computePass.dispatchWorkgroups(Math.ceil(this.particleNum / 64));
        computePass.end();

        const textureView: GPUTextureView = <GPUTextureView> this.context.getCurrentTexture().createView();
        const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments:[{
                view: textureView,
                clearValue: {r:0,g:0,b:0,a:1.0},
                loadOp: "clear",
                storeOp: "store"
            }]
        })
        renderPass.setPipeline(this.renderPipeline)
        renderPass.setVertexBuffer(0,this.particleVertexBuffer)
        renderPass.setBindGroup(0,this.bindGroup) //bindgroup at binding(0) group(0)
        renderPass.draw(1,objectCount,0,0);
        renderPass.end();
        this.device.queue.submit([commandEncoder.finish()])
    }
}