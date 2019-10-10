const vsUpdateVelocity = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uPositionOld;
uniform float uDeltaTime;

out vec4 colorData;

const float EPSILON = 0.000001;

void main() {

    int tSize = textureSize(uPosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    vec4 prevPositionData = texture(uPositionOld, index);
    vec3 velocity = (texture(uPosition, index).rgb - prevPositionData.rgb) / max(uDeltaTime, EPSILON);
        
    colorData = vec4(velocity, 1.);

}

`;

export {vsUpdateVelocity}
