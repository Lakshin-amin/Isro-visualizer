import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TMP_VEC = new THREE.Vector3();
const TMP_TARGET = new THREE.Vector3();

export function useCameraController() {
  const { camera, controls } = useThree(({ camera, controls }) => ({ camera, controls }));
  const animRef = useRef(null);

  const flyTo = useCallback((targetPos, distance = 12, duration = 1.8) => {
    const startPos = camera.position.clone();
    const startTarget = controls ? controls.target.clone() : new THREE.Vector3();
    const endTarget = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);

    // Position camera offset from target
    const dir = camera.position.clone().sub(endTarget).normalize();
    const endPos = endTarget.clone().addScaledVector(dir, distance);

    const startTime = performance.now();
    animRef.current = {
      startPos, startTarget, endPos, endTarget,
      startTime, duration: duration * 1000,
    };
  }, [camera, controls]);

  const resetView = useCallback(() => {
    flyTo({ x: 0, y: 0, z: 0 }, 140, 1.5);
  }, [flyTo]);

  // Run animation each frame
  useFrame(() => {
    const anim = animRef.current;
    if (!anim) return;
    const elapsed = performance.now() - anim.startTime;
    const t = Math.min(elapsed / anim.duration, 1);
    const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; // ease in-out cubic

    camera.position.lerpVectors(anim.startPos, anim.endPos, ease);
    if (controls) {
      controls.target.lerpVectors(anim.startTarget, anim.endTarget, ease);
      controls.update();
    }
    if (t >= 1) animRef.current = null;
  });

  return { flyTo, resetView };
}
