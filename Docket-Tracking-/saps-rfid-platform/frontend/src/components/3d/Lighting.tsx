/**
 * 3D Scene Lighting Setup
 *
 * Professional warehouse lighting with:
 * - Ambient light for base illumination
 * - Directional light simulating sun/ceiling lights
 * - Hemisphere light for natural color grading
 * - Shadow mapping for depth perception
 */
const Lighting = () => {
  return (
    <>
      {/* Ambient light - base illumination */}
      <ambientLight intensity={0.3} />

      {/* Directional light - main light source with shadows */}
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      {/* Hemisphere light - sky/ground color grading */}
      <hemisphereLight
        args={['#ffffff', '#444444', 0.6]}
        position={[0, 50, 0]}
      />

      {/* Point lights for accent lighting (optional) */}
      <pointLight position={[-50, 30, -50]} intensity={0.5} />
      <pointLight position={[50, 30, 50]} intensity={0.5} />
    </>
  );
};

export default Lighting;
