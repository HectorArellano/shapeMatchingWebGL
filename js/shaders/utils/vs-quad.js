const vsQuad = `#version 300 es

out vec2 uv;
out vec4 colorData;

void main() {
    int index = gl_VertexID;
    vec2 position = 2. * vec2(float(index % 2), float(index / 2)) - vec2(1.);
    uv = 0.5 * position + vec2(0.5);

    colorData = vec4(1.);

    gl_Position = vec4(position, 0., 1.);
}

`;

export {vsQuad}