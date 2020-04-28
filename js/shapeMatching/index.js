import {gl}                     from '../utils/webGL2.js';
import * as webGL2              from '../utils/webGL2.js';
import {Camera}                 from '../utils/camera.js';
import {fsCalculateSums}        from '../shaders/shapeMatching/fs-sums.js';
import {vsRelativePosition}     from '../shaders/shapeMatching/vs-relativePosition.js';
import {fsGenerateMatrix}       from '../shaders/shapeMatching/fs-generateMatrix.js';
import {predictPositions}       from '../shaders/shapeMatching/vs-applyForces.js';
import {vsUpdateVelocity}       from '../shaders/shapeMatching/vs-updateVelocity.js';
import {vsCollisions}           from '../shaders/shapeMatching/vs-collisions.js';
import {fsGenerateLinearMatrix} from '../shaders/shapeMatching/fs-generateLinearMatrix.js';
import {vsTransformParticles}   from '../shaders/shapeMatching/vs-transformParticles.js';
import {fsCollisions}           from '../shaders/shapeMatching/fs-collisions.js';

import {fsColor}                from '../shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from '../shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from '../shaders/utils/vs-quad.js';

import {vec4, mat4}             from "gl-matrix"

import * as OBJ                 from "webgl-obj-loader"

import egg                      from "./egg.js";

//=======================================================================================================
// Constants, Variables
//=======================================================================================================

//For the arranged particles
let particlesTextureSize;
let particlesPosition = [];
let particlesVelocity = [];
let currentFrame = 0;
let totalParticles = 0;
let totalIndexes = 0;
let indexParticles = [];
let shapeInfo = [];

let voxelResolution; //Define this with the init function

let latitudeBands = 5;
let longitudeBands = 5;
let amountOfShapes = 0;

let planeX = 0;

let transformMatrix;
let perspectiveMatrix;

//Variables holding the textures
let positionsTexture,
    prevPositionsTexture,
    iterationsTextureA,
    iterationsTextureB,
    velocityTexture,
    initialRelativePositionTexture,
    relativePositionTexture,
    positionsFB,
    velocityFB,
    iterationsAfb,
    initialRelativePositionFramebuffer,
    relativePositionFramebuffer,
    collisionsFB,
    shapeInfoTexture,
    initialCenterOfMassTexture,
    initialCenterOfMassFB,
    centerOfMassTexture,
    centerOfMassFB,
    matrixParticlesTexture0,
    matrixParticlesTexture1,
    matrixParticlesTexture2,
    matrixParticlesFB,
    AqqTexture0,
    AqqTexture1,
    AqqTexture2,
    AqqFB0,
    AqqFB1,
    AqqFB2,
    ApqTexture0,
    ApqTexture1,
    ApqTexture2,
    ApqFB0,
    ApqFB1,
    ApqFB2,
    linearMatrixTexture0,
    linearMatrixTexture1,
    linearMatrixTexture2,
    linearMatrixFB,
    attractorTexture;


//Arrays for the textures levels (used for the sums)
let sumsLevelsTex = [];
let sumsLevelsFB = [];


//Programs variables for the GPU shaders
let textureProgram,
    calculateSumsProgram,
    relativePositionProgram,
    generateMatrixProgram,
    predictPositionsProgram,
    updateVelocityProgram,
    collisionsProgram,
    generateLinearMatrixProgram,
    transformParticlesProgram;


let mesh;
let uvIndices = []

mesh = new OBJ.Mesh(egg);


//=======================================================================================================
// Helper function used for the initial state and simulation steps
//=======================================================================================================
const generateBox = (side, center, stiffness) => {

    amountOfShapes ++;

    let partialParticles = 0;

    mesh.indices.map(index => {
            particlesPosition.push(mesh.vertices[3 * index] * 10 + center.x, 
                                    mesh.vertices[3 * index + 1] * 10 + center.y, 
                                    mesh.vertices[3 * index + 2] * 10 + center.z, 
                                    amountOfShapes);

            uvIndices.push(mesh.textures[2 * index], mesh.textures[2 * index + 1]);

            particlesVelocity.push(0, 0, 0, 0);

            totalParticles++;
            partialParticles++;
    });

    indexParticles = mesh.indices;
    totalIndexes = mesh.indices.length;

    //This is for the shape information
    shapeInfo.push(partialParticles, side, stiffness);

}

const calculateSums = (initialTexture, outputFramebuffer, shapeId) => {

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

const calculateRelativePositions = (centerOfMassTexture, outputFramebuffer) => {
    gl.useProgram(relativePositionProgram);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, outputFramebuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    webGL2.bindTexture(relativePositionProgram.positions, iterationsTextureB, 0);
    webGL2.bindTexture(relativePositionProgram.centerOfMass, centerOfMassTexture, 1);
    webGL2.bindTexture(relativePositionProgram.shapesInfo, shapeInfoTexture, 2);
    gl.drawArrays(gl.POINTS, 0, totalParticles);
}

const startMatrixApq = (textureP, textureQ, outputFBs) => {

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


//==================================================================================================================================================================================
// Init function, should define the spheres and the voxel resolution TODO: define if the spheres should be defined outside, if so make a function public to handle requirements
//==================================================================================================================================================================================


const init = (_voxelResolution) => {

    voxelResolution = _voxelResolution;

    //TODO: this part should be more exposed
    //Generate the soft body spheres
    const r = 0.3 * voxelResolution;
    const c = 0.5 * voxelResolution;

    generateBox(6, {x: 20, y: 30, z: 20}, 0.6);
    generateBox(6, {x: 20, y: 15, z: 20}, 0.6);


    console.log("the total particles are: " + totalParticles);

    //Define the particles texture size based on the particles used, texture is defined as a power of 2
    particlesTextureSize = Math.pow(2, Math.ceil(Math.log(Math.sqrt(totalParticles)) / Math.log(2)));

    console.log(particlesTextureSize);

    //This fills the rest of buffer to generate the texture
    for(let i = totalParticles; i < particlesTextureSize * particlesTextureSize; i ++) {
        particlesPosition.push(0, 0, 0, 0);
        particlesVelocity.push(0, 0, 0, 0);
    }

    positionsTexture =                      webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
    prevPositionsTexture =                  webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
    iterationsTextureA =                    webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
    iterationsTextureB =                    webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesPosition));
    velocityTexture =                       webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(particlesVelocity));
    initialRelativePositionTexture =        webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    relativePositionTexture =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

    positionsFB =                           webGL2.createDrawFramebuffer(positionsTexture);
    velocityFB =                            webGL2.createDrawFramebuffer(velocityTexture);
    iterationsAfb =                         webGL2.createDrawFramebuffer(iterationsTextureA);
    initialRelativePositionFramebuffer =    webGL2.createDrawFramebuffer(initialRelativePositionTexture);
    relativePositionFramebuffer =           webGL2.createDrawFramebuffer(relativePositionTexture);
    collisionsFB =                          webGL2.createDrawFramebuffer([iterationsTextureB, prevPositionsTexture]);

    shapeInfoTexture =                      webGL2.createTexture2D(amountOfShapes * 3, 1, gl.R32F, gl.RED, gl.NEAREST, gl.NEAREST, gl.FLOAT, new Float32Array(shapeInfo));
    initialCenterOfMassTexture =            webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    initialCenterOfMassFB =                 webGL2.createDrawFramebuffer(initialCenterOfMassTexture);
    centerOfMassTexture =                   webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT);
    centerOfMassFB =                        webGL2.createDrawFramebuffer(centerOfMassTexture);

    matrixParticlesTexture0 =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    matrixParticlesTexture1 =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    matrixParticlesTexture2 =               webGL2.createTexture2D(particlesTextureSize, particlesTextureSize, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    matrixParticlesFB =                     webGL2.createDrawFramebuffer([matrixParticlesTexture0, matrixParticlesTexture1, matrixParticlesTexture2]);

    AqqTexture0 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    AqqTexture1 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    AqqTexture2 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

    AqqFB0 =                                webGL2.createDrawFramebuffer(AqqTexture0);
    AqqFB1 =                                webGL2.createDrawFramebuffer(AqqTexture1);
    AqqFB2 =                                webGL2.createDrawFramebuffer(AqqTexture2);

    ApqTexture0 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    ApqTexture1 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    ApqTexture2 =                           webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

    ApqFB0 =                                webGL2.createDrawFramebuffer(ApqTexture0);
    ApqFB1 =                                webGL2.createDrawFramebuffer(ApqTexture1);
    ApqFB2 =                                webGL2.createDrawFramebuffer(ApqTexture2);

    linearMatrixTexture0 =                  webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    linearMatrixTexture1 =                  webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    linearMatrixTexture2 =                  webGL2.createTexture2D(amountOfShapes, 1, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);
    linearMatrixFB =                        webGL2.createDrawFramebuffer([linearMatrixTexture0, linearMatrixTexture1, linearMatrixTexture2]);

    attractorTexture =                      webGL2.createTexture2D(amountOfShapes, 1, gl.RGB32F, gl.RGB, gl.NEAREST, gl.NEAREST, gl.FLOAT, null);

    for (let i = 0; i < Math.ceil(Math.log(particlesTextureSize) / Math.log(2)); i++) {
        let size = Math.pow(2, i);
        sumsLevelsTex.push(webGL2.createTexture2D(size, size, gl.RGBA32F, gl.RGBA, gl.NEAREST, gl.NEAREST, gl.FLOAT));
        sumsLevelsFB.push(webGL2.createDrawFramebuffer(sumsLevelsTex[i]));
    }

    textureProgram =                                webGL2.generateProgram(vsQuad, fsTextureColor);
    textureProgram.texture =                        gl.getUniformLocation(textureProgram, "uTexture");
    textureProgram.forceAlpha =                     gl.getUniformLocation(textureProgram, "uForceAlpha");

    calculateSumsProgram =                          webGL2.generateProgram(vsQuad, fsCalculateSums);
    calculateSumsProgram.potentialTexture =         gl.getUniformLocation(calculateSumsProgram, "uPyT");
    calculateSumsProgram.size =                     gl.getUniformLocation(calculateSumsProgram, "uSize");
    calculateSumsProgram.shapeId =                  gl.getUniformLocation(calculateSumsProgram, "uShapeId");

    relativePositionProgram =                       webGL2.generateProgram(vsRelativePosition, fsColor);
    relativePositionProgram.positions =             gl.getUniformLocation(relativePositionProgram, "uPositions");
    relativePositionProgram.centerOfMass =          gl.getUniformLocation(relativePositionProgram, "uCenterOfMass");
    relativePositionProgram.shapesInfo =            gl.getUniformLocation(relativePositionProgram, "uShapesInfo");

    generateMatrixProgram =                         webGL2.generateProgram(vsQuad, fsGenerateMatrix);
    generateMatrixProgram.positionsP =              gl.getUniformLocation(generateMatrixProgram, "uPositionsP");
    generateMatrixProgram.positionsQ =              gl.getUniformLocation(generateMatrixProgram, "uPositionsQ");

    predictPositionsProgram =                       webGL2.generateProgram(predictPositions, fsColor);
    predictPositionsProgram.positionTexture =       gl.getUniformLocation(predictPositionsProgram, "uTexturePosition");
    predictPositionsProgram.velocityTexture =       gl.getUniformLocation(predictPositionsProgram, "uTextureVelocity");
    predictPositionsProgram.deltaTime =             gl.getUniformLocation(predictPositionsProgram, "uDeltaTime");
    predictPositionsProgram.accelerationTexture =   gl.getUniformLocation(predictPositionsProgram, "uAttractorTexture");
    predictPositionsProgram.centerOfMass =          gl.getUniformLocation(predictPositionsProgram, "uCenterOfMass");
    predictPositionsProgram.shapesInfo =            gl.getUniformLocation(predictPositionsProgram, "uShapesInfo");

    updateVelocityProgram =                         webGL2.generateProgram(vsUpdateVelocity, fsColor);
    updateVelocityProgram.position =                gl.getUniformLocation(updateVelocityProgram, "uPosition");
    updateVelocityProgram.positionOld =             gl.getUniformLocation(updateVelocityProgram, "uPositionOld");
    updateVelocityProgram.deltaTime =               gl.getUniformLocation(updateVelocityProgram, "uDeltaTime");

    collisionsProgram =                             webGL2.generateProgram(vsCollisions, fsCollisions);
    collisionsProgram.positions =                   gl.getUniformLocation(collisionsProgram, "uPositions");
    collisionsProgram.prevPositions =               gl.getUniformLocation(collisionsProgram, "uPrevPositions");
    collisionsProgram.voxelResolution =             gl.getUniformLocation(collisionsProgram, "uVoxelResolution");
    collisionsProgram.shapesInfo =                  gl.getUniformLocation(collisionsProgram, "uShapesInfo");
    collisionsProgram.centerOfMass =                gl.getUniformLocation(collisionsProgram, "uCenterOfMass");
    collisionsProgram.linearMatrix0 =               gl.getUniformLocation(collisionsProgram, "uLinearMatrix0");
    collisionsProgram.linearMatrix1 =               gl.getUniformLocation(collisionsProgram, "uLinearMatrix1");
    collisionsProgram.linearMatrix2 =               gl.getUniformLocation(collisionsProgram, "uLinearMatrix2");
    collisionsProgram.planeX =                      gl.getUniformLocation(collisionsProgram, "uPlaneX");

    generateLinearMatrixProgram =                   webGL2.generateProgram(vsQuad, fsGenerateLinearMatrix);
    generateLinearMatrixProgram.shapeId =           gl.getUniformLocation(generateLinearMatrixProgram, "uShapeId");
    generateLinearMatrixProgram.Aqq0 =              gl.getUniformLocation(generateLinearMatrixProgram, "uAqq0");
    generateLinearMatrixProgram.Aqq1 =              gl.getUniformLocation(generateLinearMatrixProgram, "uAqq1");
    generateLinearMatrixProgram.Aqq2 =              gl.getUniformLocation(generateLinearMatrixProgram, "uAqq2");
    generateLinearMatrixProgram.Apq0 =              gl.getUniformLocation(generateLinearMatrixProgram, "uApq0");
    generateLinearMatrixProgram.Apq1 =              gl.getUniformLocation(generateLinearMatrixProgram, "uApq1");
    generateLinearMatrixProgram.Apq2 =              gl.getUniformLocation(generateLinearMatrixProgram, "uApq2");

    transformParticlesProgram =                     webGL2.generateProgram(vsTransformParticles, fsColor);
    transformParticlesProgram.positions =           gl.getUniformLocation(transformParticlesProgram, "uPositions");
    transformParticlesProgram.relPositions =        gl.getUniformLocation(transformParticlesProgram, "uInitialRelativePositions");
    transformParticlesProgram.centerOfMass =        gl.getUniformLocation(transformParticlesProgram, "uCenterOfMass");
    transformParticlesProgram.linearMatrix0 =       gl.getUniformLocation(transformParticlesProgram, "uLinearMatrix0");
    transformParticlesProgram.linearMatrix1 =       gl.getUniformLocation(transformParticlesProgram, "uLinearMatrix1");
    transformParticlesProgram.linearMatrix2 =       gl.getUniformLocation(transformParticlesProgram, "uLinearMatrix2");
    transformParticlesProgram.shapesInfo =          gl.getUniformLocation(transformParticlesProgram, "uShapesInfo");



    //Calculate the initial center of mass for the shape
    for(let i = 1; i <= amountOfShapes; i ++) {
        calculateSums(positionsTexture, initialCenterOfMassFB, i);
    }

    //Calculate the initial relative positions
    calculateRelativePositions(initialCenterOfMassTexture, initialRelativePositionFramebuffer);

    //Calculate the initial Aqq (non inverted) matrix for the shape
    startMatrixApq(initialRelativePositionTexture, initialRelativePositionTexture, [AqqFB0, AqqFB1, AqqFB2]);

    particlesPosition = null;
    particlesVelocity = null;

    //Move the plane in the x direction
    window.addEventListener("mousemove", (e) => {
       let A = mat4.create();
       let B = mat4.create();

       mat4.invert(A, transformMatrix);
       mat4.invert(B, perspectiveMatrix);

       const x = 2. * e.clientX / window.innerWidth - 1;
       const y = 2. * e.clientY / window.innerHeight - 1;

       let C = vec4.fromValues(x, y, 0.5, 1);

       vec4.transformMat4(C, C, B);

        // vec4.transformMat4(C, C, A);

        planeX = 2 * C[0] * voxelResolution + 0.5 * voxelResolution;

    });
    
}


//========================================================================================================================================
// Simulation step, the call should provide the delta time (to accelerate of slow down the simulation, and the total iterations for step.
//========================================================================================================================================


let update = (deltaTime, iterations, _recalculateRandomPoints, _transformMatrix, _perspectiveMatrix) => {

    transformMatrix =_transformMatrix;
    perspectiveMatrix = _perspectiveMatrix;

    //Apply external forces (gravity)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, iterationsAfb);
    gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
    gl.useProgram(predictPositionsProgram);
    gl.uniform1f(predictPositionsProgram.deltaTime, deltaTime);
    webGL2.bindTexture(predictPositionsProgram.positionTexture, positionsTexture, 0);
    webGL2.bindTexture(predictPositionsProgram.velocityTexture, velocityTexture, 1);
    webGL2.bindTexture(predictPositionsProgram.accelerationTexture, attractorTexture, 2);
    webGL2.bindTexture(predictPositionsProgram.centerOfMass, currentFrame == 0? initialCenterOfMassTexture : centerOfMassTexture, 3);
    webGL2.bindTexture(predictPositionsProgram.shapesInfo, shapeInfoTexture, 4);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, totalParticles);


    for (let i = 0; i < iterations; i++) {


        //Evaluate the collisions for the particles
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, collisionsFB);
        gl.viewport(0, 0, particlesTextureSize, particlesTextureSize);
        gl.useProgram(collisionsProgram);

        gl.uniform1f(collisionsProgram.voxelResolution, voxelResolution);
        gl.uniform1f(collisionsProgram.planeX, planeX);

        webGL2.bindTexture(collisionsProgram.positions, iterationsTextureA, 0);
        webGL2.bindTexture(collisionsProgram.prevPositions, positionsTexture, 1);
        webGL2.bindTexture(collisionsProgram.centerOfMass, centerOfMassTexture, 2);
        webGL2.bindTexture(collisionsProgram.shapesInfo, shapeInfoTexture, 3);
        webGL2.bindTexture(collisionsProgram.linearMatrix0, linearMatrixTexture0, 4);
        webGL2.bindTexture(collisionsProgram.linearMatrix1, linearMatrixTexture1, 5);
        webGL2.bindTexture(collisionsProgram.linearMatrix2, linearMatrixTexture2, 6);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, totalParticles);


        //Calculate the center of mass for the current frame
        for (let q = 1; q <= amountOfShapes; q++)calculateSums(iterationsTextureB, centerOfMassFB, q);


        //Calculate the relative positions for the current frame with the current center of mass
        calculateRelativePositions(centerOfMassTexture, relativePositionFramebuffer);


        //Start the calculation of the Apq matrix
        startMatrixApq(relativePositionTexture, initialRelativePositionTexture, [ApqFB0, ApqFB1, ApqFB2]);


        //Calculate the linear matrix
        for (let q = 0; q < amountOfShapes; q++) {
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
        webGL2.bindTexture(transformParticlesProgram.positions, iterationsTextureB, 0);
        webGL2.bindTexture(transformParticlesProgram.relPositions, initialRelativePositionTexture, 1);
        webGL2.bindTexture(transformParticlesProgram.centerOfMass, centerOfMassTexture, 2);
        webGL2.bindTexture(transformParticlesProgram.linearMatrix0, linearMatrixTexture0, 3);
        webGL2.bindTexture(transformParticlesProgram.linearMatrix1, linearMatrixTexture1, 4);
        webGL2.bindTexture(transformParticlesProgram.linearMatrix2, linearMatrixTexture2, 5);
        webGL2.bindTexture(transformParticlesProgram.shapesInfo, shapeInfoTexture, 6);

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

    currentFrame ++;

};

export {init, update, positionsTexture, totalParticles, indexParticles, uvIndices}



