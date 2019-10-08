const vsParticles = `#version 300 es
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

uniform sampler2D uTexturePosition;
uniform float uScale;
uniform vec3 uBucketData;
out vec4 colorData;

void main() {

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    vec4 positionData = texture(uTexturePosition, index);

    vec3 spacePosition = positionData.rgb;

    vec3 position = spacePosition / uScale;

    colorData.rgb =vec3(1.);

    colorData.a = 0.4;

    gl_Position = uPMatrix * uCameraMatrix * vec4(position, 1.);

    gl_PointSize = 2.;
}
`;

export {vsParticles}
