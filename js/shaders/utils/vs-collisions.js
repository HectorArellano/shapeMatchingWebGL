const vsCollisions = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uPositions;
uniform sampler2D uPrevPositions;
uniform float uVoxelResolution;

out vec4 colorData1;
out vec4 colorData2;

void main() {

    int tSize = textureSize(uPositions, 0).x;
    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    vec4 positionData = texture(uPositions, index);
    vec3 position = positionData.rgb;
    vec3 prevPosition = texture(uPrevPositions, index).rgb;


    //Collision against a sphere border
    vec3 center = vec3(uVoxelResolution * 0.5);
    float radius = uVoxelResolution * 0.48;
    vec3 normal = position - center;
    float n = length(normal);
    float distance = n -  radius;

    if(distance > 0. ) {

        normal = normalize(normal);
        colorData1 = vec4(center + normal * radius, positionData.a);
        colorData2 = colorData1;

    } else {

        //This is the new iteration position
        colorData1 = vec4(position, positionData.a);

        //This is the unaltered original position
        colorData2 = vec4(prevPosition, positionData.a);

    }

    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;
}

`;

export {vsCollisions}