struct Particle {
    position: vec3<f32>,
    velocity: vec3<f32>,
}
struct Particles {
    particles: array<Particle>
}
struct VertexOutput{
    @builtin(position) Position: vec4<f32>
}
@binding(0) @group(0) var<storage,read> data : Particles;
@vertex //can be executed in render pipeline
fn vs_main(@builtin(instance_index) id: u32) -> VertexOutput{
    var particle: Particle = data.particles[id];
    var output: VertexOutput;
    output.Position = vec4<f32>(particle.position,1.0);
    return output;
}
@fragment //can be executed in render pipeline
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    var color = vec4<f32>(1.0,1.0,1.0,1.0);
    color.a = 0.5;
    return color;
}
