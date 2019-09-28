const vsRenderBGSphere = `#version 300 es

in vec4 aPositions;

uniform sampler2D uTexturePosition;
uniform mat4 uCameraMatrix;
uniform mat4 uPMatrix;

out vec4 colorData;

void main() {

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    //Positions are in the [0, 128) range, the division normalizes to the space [0 - 1).
    vec3 spacePosition = texture(uTexturePosition, index).rgb;

    vec4 positions = vec4(spacePosition.rgb / 100., 1.);

    gl_Position = uPMatrix * uCameraMatrix * positions;
    colorData = vec4(positions.rgb, .5);
}
`;

export {vsRenderBGSphere}
