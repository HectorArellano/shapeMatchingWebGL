const vsCollisions = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uPositions;
uniform sampler2D uPrevPositions;
uniform sampler2D uShapesInfo;
uniform sampler2D uCenterOfMass;
uniform float uVoxelResolution;
uniform sampler2D uLinearMatrix0;
uniform sampler2D uLinearMatrix1;
uniform sampler2D uLinearMatrix2;
uniform float uPlaneX;

out vec4 colorData1;
out vec4 colorData2;

float sdBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return length(max(d,0.0))
         + min(max(d.x,max(d.y,d.z)),0.0); // remove this line for an only partially signed sdf
}

void main() {

    int tSize = textureSize(uPositions, 0).x;
    float tSizef = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / tSizef)) + 0.5) / tSizef;

    vec4 positionData = texture(uPositions, index);

    vec3 position = positionData.rgb;

    vec3 prevPosition = texture(uPrevPositions, index).rgb;

    //Collision against bounding spheres (broad phase detection)
    int amountOfShapes = textureSize(uCenterOfMass, 0).x;

    for(int i = 0; i < amountOfShapes; i ++) {

        if( (positionData.a - 1.) != float(i) ) {

            float amountOfParticles =   texelFetch(uShapesInfo, ivec2(3 * i, 0), 0).r;
            float c_shapeSide =         texelFetch(uShapesInfo, ivec2(3 * i + 1, 0), 0).r;
            vec3 centerOfMass =         texelFetch(uCenterOfMass, ivec2(i, 0), 0).rgb / amountOfParticles;

            if(length(centerOfMass - position) < c_shapeSide) {

                //Test the inner particles from the shape
                int partialParticles = int(amountOfParticles);
                for(int j = partialParticles * i; j < partialParticles * (i + 1); j ++) {

                    vec2 c_index = vec2(float(j % tSize) + 0.5, (floor(float(j) / tSizef)) + 0.5) / tSizef;
                    vec3 c_position = texture(uPositions, c_index).rgb;

                    vec3 c_dist = position - c_position;
                    if(length(c_dist) < 1.3) {

                        position = c_position + 1.3 * normalize(prevPosition - c_position);
                        prevPosition = position;
                    }
                }
            }
        }
    }

    vec3 center = vec3(uVoxelResolution * 0.5);
    float radius = uVoxelResolution * 0.5;

    //Collision against a sphere border
    vec3 normal = position - center;
    float n = length(normal);
    float distance = n -  radius;
    if(distance > 0. ) {
       position = center + normalize(normal) * radius;
       // prevPosition = position;
    }


    //Collision against a cylinder border
    // vec2 n = position.yz - center.yz;
    // float distance = length(n) - radius;
    // if(distance > 0.) {
    //     position.yz = center.yz + normalize(n) * radius;
    //     // prevPosition = position;
    // }
    //
    // //Collision against planes
    //
    // if(position.x < center.x - 0.24 * radius) {
    //     position.x = center.x - 0.24 * radius;
    //     // prevPosition = position;
    // }
    //
    // if(position.x > center.x + 0.24 * radius) {
    //     position.x = center.x + 0.24 * radius;
    //     // prevPosition = position;
    // }
    
    if(position.z < uPlaneX) {
        position.z = uPlaneX;
        // prevPosition = position;
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