const fsCalculateSums = `#version 300 es

precision mediump float;
precision mediump sampler2D;
uniform sampler2D uPyT;
uniform float uSize;
uniform float uShapeId;
in vec2 uv;
out vec4 colorData;
const float EPSILON = 0.0001;

void main(void) {
    float k = 0.5 * uSize;
    vec2 position = floor(uv / uSize) * uSize;

    vec4 a = texture(uPyT,  position + vec2(0., 0.));
    vec4 b = texture(uPyT,  position + vec2(k, 0.));
    vec4 c = texture(uPyT,  position + vec2(0., k));
    vec4 d = texture(uPyT,  position + vec2(k, k));

    colorData = vec4(0);

    colorData = a * float(a.a == uShapeId) +
                b * float(b.a == uShapeId) +
                c * float(c.a == uShapeId) +
                d * float(d.a == uShapeId);

    colorData.a = uShapeId * float(length(colorData.rgb) > 0.);


}

`;

export {fsCalculateSums}