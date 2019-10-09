const predictPositions = `#version 300 es

precision highp sampler2D;
precision highp float;

uniform sampler2D uTexturePosition;
uniform sampler2D uTextureVelocity;
uniform sampler2D uAttractorTexture;
uniform sampler2D uCenterOfMass;
uniform sampler2D uShapesInfo;

uniform float uDeltaTime;

out vec4 colorData;

void main() {

    int tSize = textureSize(uTexturePosition, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;
    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;

    vec4 positionData = texture(uTexturePosition, index);

    int shapeId = int(positionData.a) - 1;
    float particlesPerShape = texelFetch(uShapesInfo, ivec2(shapeId * 3, 0), 0).r;
    vec3 centerOfMass = texelFetch(uCenterOfMass, ivec2(shapeId, 0), 0).rgb / particlesPerShape;
    vec3 attractor = texelFetch(uAttractorTexture, ivec2(shapeId, 0), 0).rgb;

    vec3 acceleration = 6. * normalize(attractor - centerOfMass);
    
    colorData = vec4(positionData.rgb + (texture(uTextureVelocity, index).rgb + acceleration * uDeltaTime) * uDeltaTime, positionData.a);
}

`;

export {predictPositions}
