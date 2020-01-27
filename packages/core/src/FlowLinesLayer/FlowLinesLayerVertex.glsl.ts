/*
 * Copyright 2018 Teralytics
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*
 * This file was modified by Teralytics. Originally licenced under:
 *
 * Copyright (c) 2016 Uber Technologies, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
export default `\
#define SHADER_NAME flow-line-layer-vertex-shader
#define PI 3.1415926535897932384626433832795

attribute vec3 positions;
attribute vec3 normals;
attribute vec4 instanceColors;
attribute float instanceThickness;    // 0..0.5
attribute vec3 instanceSourcePositions;
attribute vec3 instanceTargetPositions;
attribute vec3 instanceSourcePositions64Low;
attribute vec3 instanceTargetPositions64Low;
attribute vec3 instancePickingColors;
attribute vec2 instanceEndpointOffsets;
attribute float instancePickable;

uniform vec4 outlineColor;
uniform float thicknessUnit;
uniform float gap;
uniform float opacity;

varying vec4 vColor;
varying vec2 uv;

mat2 rotation_mat2(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}

vec2 vec3_to_vec2(vec3 a) {
  return vec2(a[0], a[1]);
}

// Reverse function of project_pixel_size_to_clipspace()
float project_clipspace_to_pixel_size(float offset) {
  return offset / project_uFocalDistance / project_uDevicePixelRatio / 2.0 * 
    min(project_uViewportSize.x, project_uViewportSize.y);     
}

void main(void) {
  geometry.worldPosition = instanceSourcePositions;
  geometry.worldPositionAlt = instanceTargetPositions;
  
  // Position
  vec4 source_commonspace;    
  vec4 target_commonspace;
  vec4 source = project_position_to_clipspace(instanceSourcePositions, instanceSourcePositions64Low, vec3(0.), source_commonspace);
  vec4 target = project_position_to_clipspace(instanceTargetPositions, instanceTargetPositions64Low, vec3(0.), target_commonspace);
    

  // linear interpolation of source & target to pick right coord
  float segmentIndex = positions.x;
  vec4 p = mix(source, target, segmentIndex);
  geometry.position = mix(source_commonspace, target_commonspace, segmentIndex);
  uv = positions.xy;
  geometry.uv = uv;
  if (instancePickable > 0.5) {
    geometry.pickingColor = instancePickingColors;
  }
  
  // set the clamp limits in pixel size 
  float offsetLimit = project_clipspace_to_pixel_size(length(target - source) * 0.8);    
  vec2 limitedOffsetDistances = clamp(   
    positions.yz * thicknessUnit,  // pixel size
    -offsetLimit, offsetLimit
  );
  float endpointOffset = clamp(
    1.5*mix(instanceEndpointOffsets.x, -instanceEndpointOffsets.y, positions.x),
    -offsetLimit, offsetLimit
  );

  vec4 sourceTarget = target_commonspace - source_commonspace;
  vec2 flowlineDir = normalize(sourceTarget.xy);
  vec2 perpendicularDir = rotation_mat2(0.5*PI) * flowlineDir;
  vec3 offset = vec3(
    flowlineDir * (instanceThickness * limitedOffsetDistances[1] + normals.y + endpointOffset) - 
    perpendicularDir * (instanceThickness * limitedOffsetDistances[0] + gap + normals.x),
    0.0
  );
  
  DECKGL_FILTER_SIZE(offset, geometry);
  gl_Position = p + vec4(project_pixel_size_to_clipspace(offset.xy), 0.0, 0.0);
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  
  vec4 fillColor = vec4(instanceColors.rgb, instanceColors.a * opacity) / 255.;
  if (instancePickable <= 0.5) {
    vColor = mix(fillColor, vec4(outlineColor.xyz, instanceThickness), normals.z);
  } else {
    vColor = mix(fillColor, vec4(outlineColor.xyz, outlineColor.w * fillColor.w), normals.z);
  }
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
