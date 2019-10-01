const fsGenerateLinearMatrix = `#version 300 es

precision highp float;
precision highp sampler2D;

uniform int uShapeId;

uniform sampler2D uAqq0;
uniform sampler2D uAqq1;
uniform sampler2D uAqq2;

uniform sampler2D uApq0;
uniform sampler2D uApq1;
uniform sampler2D uApq2;

layout(location = 0) out vec4 data1;
layout(location = 1) out vec4 data2;
layout(location = 2) out vec4 data3;

void main() {

    mat3 Aqq = mat3(0.);
    mat3 Apq = mat3(0.);

    Aqq[0] = texelFetch(uAqq0, ivec2(uShapeId, 0), 0).rgb;
    Aqq[1] = texelFetch(uAqq1, ivec2(uShapeId, 0), 0).rgb;
    Aqq[2] = texelFetch(uAqq2, ivec2(uShapeId, 0), 0).rgb;

    Apq[0] = texelFetch(uApq0, ivec2(uShapeId, 0), 0).rgb;
    Apq[1] = texelFetch(uApq1, ivec2(uShapeId, 0), 0).rgb;
    Apq[2] = texelFetch(uApq2, ivec2(uShapeId, 0), 0).rgb;

    mat3 ApqT = transpose(Apq);

    mat3 S = ApqT * Apq;
    mat3 Si = mat3(1., 0., 0., 0., 1., 0., 0., 0., 1.);

    /*
     Using Babylonian method to evaluate the square root.
     */

    for(int i = 0; i < 40; i ++) {

        Si = 0.5 * (Si + S * inverse(Si));

    }

    mat3 R = Apq * inverse(Si);

    //Linear extension
    mat3 A = Apq * inverse(Aqq);
    A = pow(determinant(A), 1./ 4.) * A;

    float beta = 0.1;
    A = beta * A + (1. - beta) * R;

    data1 = vec4(A[0], uShapeId);
    data2 = vec4(A[1], uShapeId);
    data3 = vec4(A[2], uShapeId);

}

`;

export {fsGenerateLinearMatrix}