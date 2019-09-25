const vsParticles = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

uniform sampler2D uTexturePosition;
uniform sampler2D uCenterOfMass;
uniform sampler2D uParticlesPerShape;
uniform float uScale;
uniform vec3 uBucketData;
out vec4 colorData;

void main() {

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    vec4 positionData = texture(uTexturePosition, index);

    float particlesPerShape = texelFetch(uParticlesPerShape, ivec2(int(positionData.a) - 1, 0), 0).r;
    vec3 centerOfMass = texelFetch(uCenterOfMass, ivec2(int(positionData.a) - 1, 0), 0).rgb / particlesPerShape;

    //Positions are in the [0, 128) range, the division normalizes to the space [0 - 1).
    vec3 spacePosition = positionData.rgb + centerOfMass;

    vec3 position = spacePosition / uScale;

    colorData.rgb =vec3(1.);

    colorData.a = 1.;

    gl_Position = uPMatrix * uCameraMatrix * vec4(position, 1.);

    gl_PointSize = 2.;
}
`;

export {vsParticles}
