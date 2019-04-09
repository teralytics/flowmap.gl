/*
 * Copyright 2019 Teralytics
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
 *
 */
export default `\
#define SHADER_NAME flow-circles-layer-fragment-shader

precision highp float;

varying vec4 vColor;
varying vec2 unitPosition;
// varying float innerUnitRadius;

void main(void) {

  float distToCenter = length(unitPosition);

  if (distToCenter > 1.0 /* || distToCenter < innerUnitRadius*/) {
    discard;
  }
  gl_FragColor = vColor;
  
  const float SOFT_OUTLINE = 0.1;
  float soften = smoothstep(0.0, SOFT_OUTLINE, 1.0 - distToCenter);
  gl_FragColor = vec4(vColor.rgb, vColor.a * soften);

  // use highlight color if this fragment belongs to the selected object.
  gl_FragColor = picking_filterHighlightColor(gl_FragColor);

  // use picking color if rendering to picking FBO.
  gl_FragColor = picking_filterPickingColor(gl_FragColor);
}
`;
