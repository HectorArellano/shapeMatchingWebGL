const vsCollisions = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uPositions;
uniform sampler2D uPrevPositions;
uniform sampler2D uShapesInfo;
uniform sampler2D uCenterOfMass;
uniform float uVoxelResolution;


out vec4 colorData1;
out vec4 colorData2;

void main() {

    int tSize = textureSize(uPositions, 0).x;
    float tSizef = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / tSizef)) + 0.5) / tSizef;

    vec4 positionData = texture(uPositions, index);
    vec3 position = positionData.rgb;
    vec3 prevPosition = texture(uPrevPositions, index).rgb;


    //Collision against bounding spheres (broadphase detection)
    int amountOfShapes = textureSize(uCenterOfMass, 0).x;


    for(int i = 0; i < amountOfShapes; i ++) {

        if((positionData.a - 1.) != float(i)) {

            float amountOfParticles = texelFetch(uShapesInfo, ivec2(3 * i, 0), 0).r;
            float c_shapeRadius = texelFetch(uShapesInfo, ivec2(3 * i + 1, 0), 0).r;

            vec3 centerOfMass = texelFetch(uCenterOfMass, ivec2(i, 0), 0).rgb / amountOfParticles;

            vec3 n3 = position - centerOfMass;
            float n1 = length(n3);

            if(n1 < c_shapeRadius) {

                position = centerOfMass + normalize(n3) * c_shapeRadius;
                prevPosition = position;
            }

        }
    }


    //Collision against a sphere border
    vec3 center = vec3(uVoxelResolution * 0.5);
    float radius = uVoxelResolution * 0.5;
    vec3 normal = position - center;
    float n = length(normal);
//    float distance = n -  radius;

    float distance = position.y;

    if(distance < 0. ) {

        position.y = 0.;
//        position = center + normalize(normal) * radius;
        prevPosition = position;

    }


    //This is the new iteration position
    colorData1 = vec4(position, positionData.a);

    //This is the unaltered original position
    colorData2 = vec4(prevPosition, positionData.a);


    gl_Position = vec4(2. * index - vec2(1.), 0., 1.);
    gl_PointSize = 1.;
}

`;

export {vsCollisions}