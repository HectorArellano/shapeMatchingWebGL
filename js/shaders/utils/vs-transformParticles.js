const vsTransformParticles = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uPositions;
uniform sampler2D uInitialRelativePositions;
uniform sampler2D uCenterOfMass;
uniform sampler2D uLinearMatrix0;
uniform sampler2D uLinearMatrix1;
uniform sampler2D uLinearMatrix2;
uniform sampler2D uParticlesPerShape;
uniform float uStiffness;

out vec4 colorData;

void main() {

    int tSize = textureSize(uPositions, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    vec4 positionData = texture(uPositions, index);
    int shapeId = int(positionData.a) - 1;
    vec3 position = positionData.rgb;
    vec3 initialRelativePosition = texture(uInitialRelativePositions, index).rgb;

    mat3 linearMatrix = mat3(0.);
    linearMatrix[0] = texelFetch(uLinearMatrix0, ivec2(shapeId, 0), 0).rgb;
    linearMatrix[1] = texelFetch(uLinearMatrix1, ivec2(shapeId, 0), 0).rgb;
    linearMatrix[2] = texelFetch(uLinearMatrix2, ivec2(shapeId, 0), 0).rgb;

    initialRelativePosition = linearMatrix * initialRelativePosition;

    float particlesPerShape = texelFetch(uParticlesPerShape, ivec2(shapeId, 0), 0).r;

    vec3 centerOfMass = texelFetch(uCenterOfMass, ivec2(shapeId, 0), 0).rgb / particlesPerShape;

    position += uStiffness * (initialRelativePosition + centerOfMass - position);

    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    colorData = vec4(position, positionData.a);

}

`;

export {vsTransformParticles}