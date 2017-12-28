// Copyright (c) 2016 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

export default `\
#define SHADER_NAME flow-line-layer-vertex-shader
#define PI 3.1415926535897932384626433832795

attribute vec3 positions;
attribute vec3 normals;
attribute vec4 instanceColors;
attribute float instanceThickness;
attribute vec3 instanceSourcePositions;
attribute vec3 instanceTargetPositions;
attribute vec3 instancePickingColors;
attribute vec2 instanceEndpointOffsets;

uniform vec4 borderColor;
uniform float thicknessUnit;
uniform float gap;
uniform float opacity;
uniform float renderPickingBuffer;

varying vec4 vColor;

mat2 rotation_mat2(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}

vec2 vec3_to_vec2(vec3 a) {
  return vec2(a[0], a[1]);
}

void main(void) {
  vec2 projectedSourceCoord = vec3_to_vec2(project_position(instanceSourcePositions));
  vec2 projectedTargetCoord = vec3_to_vec2(project_position(instanceTargetPositions));


  vec2 sourceTarget = projectedTargetCoord - projectedSourceCoord;
  float offsetLimit = length(sourceTarget) * 0.8;
  vec2 flowlineDirection = normalize(sourceTarget);
  vec2 limitedOffsetDistances = clamp(positions.yz * thicknessUnit, -offsetLimit, offsetLimit);
  float endpointOffset = mix(instanceEndpointOffsets.x, -instanceEndpointOffsets.y, positions.x);
  vec2 offset =
    rotation_mat2(0.5*PI) * flowlineDirection * (instanceThickness * limitedOffsetDistances[0] + gap + normals.x) +
    flowlineDirection * (instanceThickness * limitedOffsetDistances[1] + normals.y + endpointOffset)
  ;


  vec2 mixed_temp = mix(projectedSourceCoord, projectedTargetCoord, positions.x);

  vec4 vertex_pos_modelspace;

  vertex_pos_modelspace[0] = mixed_temp[0] + offset[0];
  vertex_pos_modelspace[1] = mixed_temp[1] + offset[1];
  vertex_pos_modelspace[2] = 0.0;
  vertex_pos_modelspace[3] = 1.0;


  gl_Position = project_to_clipspace(vertex_pos_modelspace);

  vec4 fillColor = vec4(instanceColors.rgb, instanceColors.a * opacity) / 255.;
  vec4 color = mix(fillColor, vec4(borderColor.xyz, borderColor.w * fillColor.w), normals.z);
  vec4 pickingColor = vec4(instancePickingColors / 255., 1.);

  vColor = mix(
    color,
    pickingColor,
    renderPickingBuffer
  );

}
`;
