const vsCollisions = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D uPositions;
uniform sampler2D uPrevPositions;
uniform sampler2D uCenterOfMass;
uniform sampler2D uParticlesPerShape;

const float radius = .7;

out vec4 colorData1;
out vec4 colorData2;


void main() {

    int tSize = textureSize(uPositions, 0).x;
    int amountOfShapes = textureSize(uParticlesPerShape, 0).x;
    int particlesPerShape = int(texelFetch(uParticlesPerShape, ivec2(0, 0), 0).r);


    float textureSize = float(tSize);
    vec2 index = vec2(float(gl_VertexID % tSize) + 0.5, (floor(float(gl_VertexID) / textureSize)) + 0.5) / textureSize;

    vec4 positionData = texture(uPositions, index);
    vec3 position = positionData.rgb;
    vec3 prevPosition = texture(uPrevPositions, index).rgb;


    //Collision against other shapes
    for(int i = 0; i < amountOfShapes; i ++) {

        //Don't evaluate the particle against its own group
        if(positionData.a != float(i + 1)) {

            vec3 centerOfMass = texelFetch(uCenterOfMass, ivec2(i, 0), 0).rgb;
            vec3 dist = position - centerOfMass / float(particlesPerShape);
            float d = length(dist);

            //collides with the bounding sphere
            const float rd = 6.8;
            if(d < rd) {
            
                position = rd * normalize(dist) + centerOfMass / float(particlesPerShape);
                prevPosition = position;

                // for(int l = i * particlesPerShape; l < (i + 1) * particlesPerShape; l ++) {
                //
                //     vec2 ii = vec2(float(l % tSize) + 0.5, (floor(float(l) / textureSize)) + 0.5) / textureSize;
                //     vec3 c_position = texture(uPositions, ii).rgb;
                //
                //     vec3 c_dist = position - c_position;
                //     d = length(c_dist);
                //
                //     if(d < 2. * radius) {
                //         position += radius * normalize(c_dist);
                //     }
                //
                // }

            }

        }

    }




    //Collision against a sphere border
    vec3 center = vec3(64. * 0.5);
    float radius = 64. * 0.48;
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