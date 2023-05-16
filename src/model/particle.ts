import { vec3, mat4 } from "gl-matrix"
export class Particle {
    position: vec3;
    velocity: vec3;
    model: mat4;
    constructor(position_:vec3,velocity_:vec3){
        this.position = position_;
        this.velocity = vec3.normalize(velocity_,velocity_);
        vec3.scale(this.velocity,this.velocity,0.001)
        this.model = mat4.create();
    }
    toFloatArray(){
        return new Float32Array([...this.position,...this.velocity,0.0,0.0])
    }
}