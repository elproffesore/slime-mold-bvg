struct SimulationParams {
    deltaT: f32,
}
struct Particle {
    position: vec3<f32>,
    velocity: vec3<f32>,
}
struct Particles {
    particles: array<Particle>
}
@binding(0) @group(0) var<storage,read_write> data : Particles;
@binding(1) @group(0) var<uniform> simulationParams : SimulationParams;
@compute @workgroup_size(64,1,1)//can be executed in compute pipeline
fn cs_main(@builtin(global_invocation_id) global_invocation_id: vec3<u32>){
    var id = global_invocation_id.x;
    var particle = data.particles[id];
    if (particle.position.z > 10) {
        particle.velocity.z = -particle.velocity.z;
    }
    else if (particle.position.z < -10) {
        particle.velocity.z = abs(particle.velocity.z);
    }
    else if (particle.position.y > 10) {
        particle.velocity.y = -particle.velocity.y;
    }
    else if (particle.position.y < -10) {
        particle.velocity.y = abs(particle.velocity.y);
    }
    particle.position = particle.position + simulationParams.deltaT * particle.velocity;
    data.particles[id] = particle;
}