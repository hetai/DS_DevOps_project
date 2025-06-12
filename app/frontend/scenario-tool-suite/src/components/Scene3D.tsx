
import { useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";

// Vehicle representation in the scene
interface VehicleProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color?: string;
}

const Vehicle: React.FC<VehicleProps> = ({ position, rotation, color = "blue" }) => {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[2, 1, 4]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Road representation based on OpenDRIVE data
const Road = ({ roadData }) => {
  // Create a more detailed road surface with markings
  return (
    <group>
      {/* Base road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      
      {/* Road grid */}
      <gridHelper args={[100, 100, "#888888", "#444444"]} />
      
      {/* Lane markings - center line */}
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 100]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      {/* Lane markings - side lines */}
      <mesh position={[-4, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 100]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      <mesh position={[4, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 100]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {roadData && roadData.roads && roadData.roads.map((road, index) => (
        <group key={`road-${index}`}>
          {/* Render specific road elements based on OpenDRIVE data if available */}
          {road.lanes && road.lanes.map((lane, laneIndex) => (
            <mesh 
              key={`lane-${laneIndex}`} 
              position={[lane.offset || 0, -0.02, 0]} 
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[lane.width || 3, 100]} />
              <meshStandardMaterial color={lane.type === "driving" ? "#555555" : "#333333"} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// Main scene setup with lights and camera controls
const SceneSetup = () => {
  const { camera } = useThree();
  
  useEffect(() => {
    // Position the camera for a better view of the road
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <OrbitControls 
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <hemisphereLight intensity={0.7} groundColor="#444422" />
    </>
  );
};

interface Scene3DProps {
  isPlaying: boolean;
  simulationTime: number;
  scenarioFile: File | null;
  driveFile: File | null;
}

const Scene3D: React.FC<Scene3DProps> = ({ isPlaying, simulationTime, scenarioFile, driveFile }) => {
  const [vehicles, setVehicles] = useState<VehicleProps[]>([
    // Default vehicle for visualization testing
    { position: [0, 0, 0], rotation: [0, 0, 0] }
  ]);
  
  // Process OpenDRIVE data
  const [roadData, setRoadData] = useState<any>(null);

  useEffect(() => {
    if (isPlaying) {
      // This would be replaced with actual WebSocket data in the future
      const interval = setInterval(() => {
        setVehicles(prev => {
          // Simple animation for testing: move vehicle forward
          return prev.map(vehicle => ({
            ...vehicle,
            position: [
              vehicle.position[0], 
              vehicle.position[1], 
              vehicle.position[2] + 0.1
            ] as [number, number, number]
          }));
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (scenarioFile && driveFile) {
      console.log("Files loaded:", 
        scenarioFile.name, `(${(scenarioFile.size / 1024).toFixed(2)} KB)`,
        driveFile.name, `(${(driveFile.size / 1024).toFixed(2)} KB)`
      );
      
      // Read and parse the OpenDRIVE file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xmlContent = e.target?.result as string;
          console.log("OpenDRIVE XML content loaded, sample:", xmlContent.substring(0, 100) + "...");
          
          // Basic parsing of OpenDRIVE XML to extract road data
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
          
          // Extract road elements
          const roadElements = xmlDoc.getElementsByTagName('road');
          const roads = [];
          
          for (let i = 0; i < roadElements.length; i++) {
            const road = roadElements[i];
            const roadId = road.getAttribute('id');
            const length = road.getAttribute('length');
            
            // Extract lanes
            const lanesElements = road.getElementsByTagName('lanes');
            const lanes = [];
            
            if (lanesElements.length > 0) {
              const laneElements = lanesElements[0].getElementsByTagName('lane');
              
              for (let j = 0; j < laneElements.length; j++) {
                const lane = laneElements[j];
                const laneId = lane.getAttribute('id');
                const type = lane.getAttribute('type');
                const width = lane.getElementsByTagName('width').length > 0 ? 
                    parseFloat(lane.getElementsByTagName('width')[0].getAttribute('a') || "3") : 3;
                    
                lanes.push({
                  id: laneId,
                  type: type,
                  width: width,
                  offset: (j - Math.floor(laneElements.length / 2)) * width
                });
              }
            }
            
            roads.push({
              id: roadId,
              length: length,
              lanes: lanes
            });
          }
          
          console.log("Parsed OpenDRIVE data:", roads);
          setRoadData({ roads });
        } catch (error) {
          console.error("Error parsing OpenDRIVE file:", error);
        }
      };
      reader.readAsText(driveFile);
      
      // Reset vehicle position when new files are loaded
      setVehicles([{ position: [0, 0, 0], rotation: [0, 0, 0] }]);
    }
  }, [scenarioFile, driveFile]);

  return (
    <Canvas shadows className="w-full h-full">
      <SceneSetup />
      <Road roadData={roadData} />
      {vehicles.map((vehicle, index) => (
        <Vehicle 
          key={index} 
          position={vehicle.position} 
          rotation={vehicle.rotation} 
          color={index % 2 === 0 ? "blue" : "red"} 
        />
      ))}
    </Canvas>
  );
};

export default Scene3D;
