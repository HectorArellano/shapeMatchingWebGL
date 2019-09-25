import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import {Camera}                 from './utils/camera.js';
import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {fsCalculateSums}        from './shaders/utils/fs-sums.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {vsRelativePosition}     from './shaders/utils/vs-relativePosition.js';
import {fsGenerateMatrix}       from './shaders/utils/fs-generateMatrix.js';
import {predictPositions}       from './shaders/utils/vs-applyForces.js';
import {vsUpdateVelocity}       from './shaders/utils/vs-updateVelocity.js';
import {vsCollisions}           from './shaders/utils/vs-collisions.js';
import {fsGenerateLinearMatrix} from './shaders/utils/fs-generateLinearMatrix.js';
import {vsTransformParticles}   from './shaders/utils/vs-transformParticles.js';
import {fsCollisions}           from './shaders/utils/fs-collisions.js';
import {vsRenderBGSphere}       from './shaders/utils/vs-renderBGSphere.js';


//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";
webGL2.setContext(canvas);


let camera = new Camera(canvas);
let cameraDistance = 2.5;
let FOV = 30;

//For the arranged particles
let particlesTextureSize;
let particlesPosition = [];
let particlesVelocity = []
let currentFrame = 0;
let totalParticles = 0;
let totalIndexes = 0;
let indexParticles = [];
let particlesPerShape = [];
const voxelResolution = 64;
const stiffness = 0.1;
const iterations = 6;
const deltaTime = 0.1;

let latitudeBands = 20;
let longitudeBands = 20;
let amountOfShapes = 0;


function generateSphere(radius, center, shapeId) {

    let partialParticles = 0;
    amountOfShapes ++;


    for (let i = 0; i < voxelResolution; i++) {
        for (let j = 0; j < voxelResolution; j++) {
            for (let k = 0; k < voxelResolution; k++) {

                //Condition for the particle position and existence
                let x = i - center.x;
                let y = j - center.y;
                let z = k - center.z;

                if (x * x + y * y + z * z < radius * radius) {
                    particlesPosition.push(i, j, k, shapeId);
                    particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
                    totalParticles++;
                    partialParticles++;
                }
            }
        }
    }

    for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
        let theta =  latNumber * Math.PI / latitudeBands;
        let sinTheta = Math.sin(theta);
        let cosTheta = Math.cos(theta);

        for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
            let phi = 2 * longNumber * Math.PI / longitudeBands;
            let sinPhi = Math.sin(phi);
            let cosPhi = Math.cos(phi);

            let x = radius * cosPhi * sinTheta + center.x;
            let y = radius * cosTheta + center.y;
            let z = radius * sinPhi * sinTheta + center.z;

            particlesPosition.push(x, y, z, shapeId);
            particlesVelocity.push(0, 0, 0, 0);
            totalParticles ++;
            partialParticles++;
        }
    }

    particlesPerShape.push(partialParticles);


    for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
            let first = (latNumber * (longitudeBands + 1)) + longNumber;
            let second = first + longitudeBands + 1;

            indexParticles.push(first);
            indexParticles.push(second);
            indexParticles.push(first + 1);

            indexParticles.push(second);
            indexParticles.push(second + 1);
            indexParticles.push(first + 1);
            totalIndexes +=6;
        }
    }
}

//Generate the soft body spheres
generateSphere(8, {x: 32, y: 32, z: 15}, 1);
generateSphere(8, {x: 32, y: 42, z: 47}, 2);
generateSphere(10, {x: 17, y: 32, z: 32}, 3);


//let borderSphereIndexes = webGL2.createBuffer(indexParticles, true);


////Generate information for the containing sphere
//let borderSphereVertices = [];
//let borderSphereIndexes = [];
//generateSphere(60, {x: 64, y: 64, z: 64}, borderSphereVertices, borderSphereIndexes);
//
//const totalIndexes = borderSphereIndexes.length;
//
//borderSphereVertices = webGL2.createBuffer(borderSphereVertices);
//borderSphereIndexes = webGL2.createBuffer(borderSphereIndexes, true);


////Generate the position and velocity
//for (let i = 0; i < voxelResolution; i++) {
//    for (let j = 0; j < voxelResolution; j++) {
//        for (let k = 0; k < voxelResolution; k++) {
//
//            //Condition for the particle position and existence
//            let x = i - voxelResolution * 0.5;
//            let y = j - voxelResolution * 0.5;
//            let z = k - voxelResolution * 0.5 + 24;
//
//            if (x * x + y * y + z * z < radius * radius) {
//                particlesPosition.push(i, j, k, 1);
//                particlesVelocity.push(0, 0, 0, 0); //Velocity is zero for all the particles.
//                totalParticles++;
//            }
//        }
//    }
//}

console.log("the total particles are: " + totalParticles);

//Define the particles texture size based on the particles used, texture is defined as a power of 2
particlesTextureSize = Math.pow(2, Math.ceil(Math.log(Math.sqrt(totalParticles)) / Math.log(2)));

console.log("the texture size is: " + particlesTextureSize);


//This fills the rest of buffer to generate the texture
for(let i = totalParticles; i < particlesTextureSize * particlesTextureSize; i ++) {
    particlesPosition.push(0, 0, 0, 0);
    particlesVelocity.push(0, 0, 0, 0);
}


//Particles texture information
let positionsTexture =                      webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
let prevPositionsTexture =                  webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
let iterationsTextureA =                    webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
let iterationsTextureB =                    webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
let velocityTexture =                       webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesVelocity));
let initialRelativePositionTexture =        webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let relativePositionTexture =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);


let positionsFB =                           webGL2.createDrawFramebuffer(positionsTexture);
let velocityFB =                            webGL2.createDrawFramebuffer(velocityTexture);
let iterationsAfb =                         webGL2.createDrawFramebuffer(iterationsTextureA);
let initialRelativePositionFramebuffer =    webGL2.createDrawFramebuffer(initialRelativePositionTexture);
let relativePositionFramebuffer =           webGL2.createDrawFramebuffer(relativePositionTexture);
let collisionsFB =                          webGL2.createDrawFramebuffer([iterationsTextureB, prevPositionsTexture]);


//Shape information
let particlesPerShapeTexture =              webGL2.createTexture2D(amountOfShapes, 1, gl.R32F, gl.RED, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPerShape));
let initialCenterOfMassTexture =            webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let initialCenterOfMassFB =                 webGL2.createDrawFramebuffer(initialCenterOfMassTexture);

let centerOfMassTexture =                   webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
let centerOfMassFB =                        webGL2.createDrawFramebuffer(centerOfMassTexture);


//Textures and framebuffers for the matrices evaluations
let matrixParticlesTexture0 =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let matrixParticlesTexture1 =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let matrixParticlesTexture2 =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let matrixParticlesFB =                     webGL2.createDrawFramebuffer([matrixParticlesTexture0, matrixParticlesTexture1, matrixParticlesTexture2]);

let AqqTexture0 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let AqqTexture1 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let AqqTexture2 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

let AqqFB0 =                                webGL2.createDrawFramebuffer(AqqTexture0);
let AqqFB1 =                                webGL2.createDrawFramebuffer(AqqTexture1);
let AqqFB2 =                                webGL2.createDrawFramebuffer(AqqTexture2);

let ApqTexture0 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let ApqTexture1 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let ApqTexture2 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

let ApqFB0 =                                webGL2.createDrawFramebuffer(ApqTexture0);
let ApqFB1 =                                webGL2.createDrawFramebuffer(ApqTexture1);
let ApqFB2 =                                webGL2.createDrawFramebuffer(ApqTexture2);

let linearMatrixTexture0 =                  webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let linearMatrixTexture1 =                  webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let linearMatrixTexture2 =                  webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
let linearMatrixFB =                        webGL2.createDrawFramebuffer([linearMatrixTexture0, linearMatrixTexture1, linearMatrixTexture2]);


let sumsLevelsTex = [];
let sumsLevelsFB = [];
for (let i = 0; i < Math.ceil(Math.log(particlesTextureSize) / Math.log(2)); i++) {
    let size = Math.pow(2, i);
    sumsLevelsTex.push(webGL2.createTexture2D(size, size, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT));
    sumsLevelsFB.push(webGL2.createDrawFramebuffer(sumsLevelsTex[i]));
}


let renderParticlesProgram =                    webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture =        gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.centerOfMass =           gl.getUniformLocation(renderParticlesProgram, "uCenterOfMass");
renderParticlesProgram.particlesPerShape =      gl.getUniformLocation(renderParticlesProgram, "uParticlesPerShape");
renderParticlesProgram.cameraMatrix =           gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix =      gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale =                  gl.getUniformLocation(renderParticlesProgram, "uScale");


let textureProgram =                            webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture =                        gl.getUniformLocation(textureProgram, "uTexture");
textureProgram.forceAlpha =                     gl.getUniformLocation(textureProgram, "uForceAlpha");


let calculateSumsProgram =                      webGL2.generateProgram(vsQuad, fsCalculateSums);
calculateSumsProgram.potentialTexture =         gl.getUniformLocation(calculateSumsProgram, "uPyT");
calculateSumsProgram.size =                     gl.getUniformLocation(calculateSumsProgram, "uSize");
calculateSumsProgram.shapeId =                  gl.getUniformLocation(calculateSumsProgram, "uShapeId");


let relativePositionProgram =                   webGL2.generateProgram(vsRelativePosition, fsColor);
relativePositionProgram.positions =             gl.getUniformLocation(relativePositionProgram, "uPositions");
relativePositionProgram.centerOfMass =          gl.getUniformLocation(relativePositionProgram, "uCenterOfMass");
relativePositionProgram.particlesPerShape =     gl.getUniformLocation(relativePositionProgram, "uParticlesPerShape");


let generateMatrixProgram =                     webGL2.generateProgram(vsQuad, fsGenerateMatrix);
generateMatrixProgram.positionsP =              gl.getUniformLocation(generateMatrixProgram, "uPositionsP");
generateMatrixProgram.positionsQ =              gl.getUniformLocation(generateMatrixProgram, "uPositionsQ");


let predictPositionsProgram =                   webGL2.generateProgram(predictPositions, fsColor);
predictPositionsProgram.positionTexture =       gl.getUniformLocation(predictPositionsProgram, "uTexturePosition");
predictPositionsProgram.velocityTexture =       gl.getUniformLocation(predictPositionsProgram, "uTextureVelocity");
predictPositionsProgram.deltaTime =             gl.getUniformLocation(predictPositionsProgram, "uDeltaTime");
predictPositionsProgram.acceleration =          gl.getUniformLocation(predictPositionsProgram, "uAcceleration");


let updateVelocityProgram =                     webGL2.generateProgram(vsUpdateVelocity, fsColor);
updateVelocityProgram.position =                gl.getUniformLocation(updateVelocityProgram, "uPosition");
updateVelocityProgram.positionOld =             gl.getUniformLocation(updateVelocityProgram, "uPositionOld");
updateVelocityProgram.deltaTime =               gl.getUniformLocation(updateVelocityProgram, "uDeltaTime");


let collisionsProgram =                         webGL2.generateProgram(vsCollisions, fsCollisions);
collisionsProgram.positions =                   gl.getUniformLocation(collisionsProgram, "uPositions");
collisionsProgram.prevPositions =               gl.getUniformLocation(collisionsProgram, "uPrevPositions");
collisionsProgram.voxelResolution =             gl.getUniformLocation(collisionsProgram, "uVoxelResolution");


let generateLinearMatrixProgram =               webGL2.generateProgram(vsQuad, fsGenerateLinearMatrix);
generateLinearMatrixProgram.shapeId =           gl.getUniformLocation(generateLinearMatrixProgram, "uShapeId");
generateLinearMatrixProgram.Aqq0 =              gl.getUniformLocation(generateLinearMatrixProgram, "uAqq0");
generateLinearMatrixProgram.Aqq1 =              gl.getUniformLocation(generateLinearMatrixProgram, "uAqq1");
generateLinearMatrixProgram.Aqq2 =              gl.getUniformLocation(generateLinearMatrixProgram, "uAqq2");
generateLinearMatrixProgram.Apq0 =              gl.getUniformLocation(generateLinearMatrixProgram, "uApq0");
generateLinearMatrixProgram.Apq1 =              gl.getUniformLocation(generateLinearMatrixProgram, "uApq1");
generateLinearMatrixProgram.Apq2 =              gl.getUniformLocation(generateLinearMatrixProgram, "uApq2");


let transformParticlesProgram =                 webGL2.generateProgram(vsTransformParticles, fsColor);
transformParticlesProgram.positions =           gl.getUniformLocation(transformParticlesProgram, "uPositions");
transformParticlesProgram.relPositions =        gl.getUniformLocation(transformParticlesProgram, "uInitialRelativePositions");
transformParticlesProgram.centerOfMass =        gl.getUniformLocation(transformParticlesProgram, "uCenterOfMass");
transformParticlesProgram.linearMatrix0 =       gl.getUniformLocation(transformParticlesProgram, "uLinearMatrix0");
transformParticlesProgram.linearMatrix1 =       gl.getUniformLocation(transformParticlesProgram, "uLinearMatrix1");
transformParticlesProgram.linearMatrix2 =       gl.getUniformLocation(transformParticlesProgram, "uLinearMatrix2");
transformParticlesProgram.stiffness =           gl.getUniformLocation(transformParticlesProgram, "uStiffness");
transformParticlesProgram.particlesPerShape =   gl.getUniformLocation(transformParticlesProgram, "uParticlesPerShape");



let renderBGSphereProgram =                     webGL2.generateProgram(vsRenderBGSphere, fsColor);
renderParticlesProgram.positionTexture =        gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderBGSphereProgram.cameraMatrix =            gl.getUniformLocation(renderBGSphereProgram, "uCameraMatrix");
renderBGSphereProgram.perspectiveMatrix =       gl.getUniformLocation(renderBGSphereProgram, "uPMatrix");



let calculateSums = (initialTexture, outputFramebuffer, shapeId) => {

    let levels = Math.ceil(Math.log(particlesTextureSize) / Math.log(2));
    gl.useProgram(calculateSumsProgram);

    for (let i = 0; i < levels; i++) {
        let size = Math.pow(2, levels - 1 - i);

        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, i == levels - 1 ? outputFramebuffer: sumsLevelsFB[levels - i - 1]);
        if(size > 1) gl.clear(gl.COLOR_BUFFER_BIT);

        //Should render the information in the position of the ID for the texture when the sums are completed
        gl.viewport(i == levels - 1 ? shapeId - 1 : 0, 0, size, size);

        gl.uniform1f(calculateSumsProgram.shapeId, shapeId);
        gl.uniform1f(calculateSumsProgram.size, Math.pow(2, i + 1) / particlesTextureSize);
        webGL2.bindTexture(calculateSumsProgram.potentialTexture, i == 0 ? initialTexture : sumsLevelsTex[levels - i], 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

let calculateRelativePositions = (centerOfMassTexture, outputFramebuffer) => {
    gl.useProgram(relativePositionProgram);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, outputFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    webGL2.bindTexture(relativePositionProgram.positions, iterationsTextureB, 0);
    webGL2.bindTexture(relativePositionProgram.centerOfMass, centerOfMassTexture, 1);
    webGL2.bindTexture(relativePositionProgram.particlesPerShape, particlesPerShapeTexture, 2);
    gl.drawArrays(gl.POINTS, 0, totalParticles);
}

let startMatrixApq = (textureP, textureQ, outputFBs) => {

    //Evaluate the matrices for each particle, it's saved in three different textures
    gl.useProgram(generateMatrixProgram);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, matrixParticlesFB);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    webGL2.bindTexture(generateMatrixProgram.positionsP, textureP, 0);
    webGL2.bindTexture(generateMatrixProgram.positionsQ, textureQ, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    //Evaluate the sum for each column component of the matrix.
    for(let i = 1; i <= amountOfShapes; i ++) {
        calculateSums(matrixParticlesTexture0, outputFBs[0], i);
        calculateSums(matrixParticlesTexture1, outputFBs[1], i);
        calculateSums(matrixParticlesTexture2, outputFBs[2], i);
    }
}


//=======================================================================================================
// Initial Steps
//=======================================================================================================

//Calculate the initial center of mass for the shape
for(let i = 1; i <= amountOfShapes; i ++) {
    calculateSums(positionsTexture, initialCenterOfMassFB, i);
}

//Calculate the initial relative positions
calculateRelativePositions(initialCenterOfMassTexture, initialRelativePositionFramebuffer);

//Calculate the initial Aqq (non inverted) matrix for the shape
startMatrixApq(initialRelativePositionTexture, initialRelativePositionTexture, [AqqFB0, AqqFB1, AqqFB2]);



//=======================================================================================================
// Simulation and Rendering
//=======================================================================================================

//Initiate the position based fluids solver
particlesPosition = null;
particlesVelocity = null;

let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, canvas.width / canvas.height, cameraDistance);
    let acceleration = {
        x: 0 * Math.sin(currentFrame * Math.PI / 180),
        y: -10,
        z: 0 * Math.cos(currentFrame * Math.PI / 180)
    }


    //Apply external forces (gravity)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, iterationsAfb);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(predictPositionsProgram);
    gl.uniform1f(predictPositionsProgram.deltaTime, deltaTime);
    gl.uniform3f(predictPositionsProgram.acceleration, 0, -10, 0);
    webGL2.bindTexture(predictPositionsProgram.positionTexture, positionsTexture, 0);
    webGL2.bindTexture(predictPositionsProgram.velocityTexture, velocityTexture, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);



    for(let i = 0; i < iterations; i ++) {

        //Evaluate the collisions for the particles
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, collisionsFB);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(collisionsProgram);
        gl.uniform1f(collisionsProgram.voxelResolution, voxelResolution);
        webGL2.bindTexture(collisionsProgram.positions, iterationsTextureA, 0);
        webGL2.bindTexture(collisionsProgram.prevPositions, positionsTexture, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Calculate the center of mass for the current frame
        for(let q = 1; q <= amountOfShapes; q ++) {
            calculateSums(iterationsTextureB, centerOfMassFB, q);
        }

        //Calculate the relative positions for the current frame with the current center of mass
        calculateRelativePositions(centerOfMassTexture, relativePositionFramebuffer);


        //Start the calculation of the Apq matrix
        startMatrixApq(relativePositionTexture, initialRelativePositionTexture, [ApqFB0, ApqFB1, ApqFB2]);


        //Calculate the linear matrix
        for(let q = 0; q < amountOfShapes; q ++) {
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, linearMatrixFB);
            gl.viewport(q, 0, 1, 1);
            gl.useProgram(generateLinearMatrixProgram);
            gl.uniform1i(generateLinearMatrixProgram.shapeId, q);
            webGL2.bindTexture(generateLinearMatrixProgram.Aqq0, AqqTexture0, 0);
            webGL2.bindTexture(generateLinearMatrixProgram.Aqq1, AqqTexture1, 1);
            webGL2.bindTexture(generateLinearMatrixProgram.Aqq2, AqqTexture2, 2);
            webGL2.bindTexture(generateLinearMatrixProgram.Apq0, ApqTexture0, 3);
            webGL2.bindTexture(generateLinearMatrixProgram.Apq1, ApqTexture1, 4);
            webGL2.bindTexture(generateLinearMatrixProgram.Apq2, ApqTexture2, 5);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }


        //Transform the positions using the previous linear matrix
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, iterationsAfb);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(transformParticlesProgram);
        gl.uniform1f(transformParticlesProgram.stiffness, stiffness);
        webGL2.bindTexture(transformParticlesProgram.positions, iterationsTextureB, 0);
        webGL2.bindTexture(transformParticlesProgram.relPositions, initialRelativePositionTexture, 1);
        webGL2.bindTexture(transformParticlesProgram.centerOfMass, centerOfMassTexture, 2);
        webGL2.bindTexture(transformParticlesProgram.linearMatrix0, linearMatrixTexture0, 3);
        webGL2.bindTexture(transformParticlesProgram.linearMatrix1, linearMatrixTexture1, 4);
        webGL2.bindTexture(transformParticlesProgram.linearMatrix2, linearMatrixTexture2, 5);
        webGL2.bindTexture(transformParticlesProgram.particlesPerShape, particlesPerShapeTexture, 6);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);

    }


    //Update the velocity
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, velocityFB);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(updateVelocityProgram);
    gl.uniform1f(updateVelocityProgram.deltaTime, deltaTime);
    webGL2.bindTexture(updateVelocityProgram.position, iterationsTextureA, 0);
    webGL2.bindTexture(updateVelocityProgram.positionOld, prevPositionsTexture, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);


    //Update the positions.
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, positionsFB);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(textureProgram);
    webGL2.bindTexture(textureProgram.texture, iterationsTextureA, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.height, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//    gl.enable(gl.DEPTH_TEST);


    //Render the container sphere
//    gl.useProgram(renderBGSphereProgram);
//    webGL2.bindTexture(renderBGSphereProgram.positionTexture, positionsTexture, 0);
//    gl.uniformMatrix4fv(renderBGSphereProgram.cameraMatrix, false, camera.cameraTransformMatrix);
//    gl.uniformMatrix4fv(renderBGSphereProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
//    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, borderSphereIndexes);
//    gl.drawElements(gl.TRIANGLES, totalIndexes, gl.UNSIGNED_SHORT, 0);




    //Render the particles from the soft body
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, relativePositionTexture, 0);
    webGL2.bindTexture(renderParticlesProgram.centerOfMass, centerOfMassTexture, 1);
    webGL2.bindTexture(renderParticlesProgram.particlesPerShape, particlesPerShapeTexture, 2);
    gl.uniform1f(renderParticlesProgram.scale, voxelResolution);
    gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.drawArrays(gl.POINTS, 0, totalParticles);
//    gl.disable(gl.DEPTH_TEST);




};

render();