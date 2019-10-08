const vsRelativePosition = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uPositions;
uniform sampler2D uCenterOfMass;
uniform sampler2D uShapesInfo;

out vec4 colorData;

void main() {

    int tSize = textureSize(uPositions, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    vec4 positionData = texture(uPositions, index);

    ivec2 readIndex = ivec2(int(positionData.a) - 1, 0);

    float particlesPerShape = texelFetch(uShapesInfo, readIndex * 3, 0).r;

    vec3 centerOfMass = texelFetch(uCenterOfMass, readIndex, 0).rgb / particlesPerShape;


    colorData = vec4(float(positionData.a > 0.) * (positionData.rgb - centerOfMass), positionData.a);
}

`;

export {vsRelativePosition}