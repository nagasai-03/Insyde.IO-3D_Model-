import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import { Canvas, useLoader, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter";
import { PLYExporter } from "three/examples/jsm/exporters/PLYExporter";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import * as THREE from 'three';

// Enhanced ModelViewer component that supports multiple file formats
const ModelViewer = ({ modelUrl, exportRef, fileFormat }) => {
  const { scene, camera } = useThree();
  const [model, setModel] = useState(null);
  
  // Load model based on file format
  React.useEffect(() => {
    if (!modelUrl) return;
    
    const loadModel = async () => {
      try {
        let loadedModel;
        
        switch (fileFormat.toLowerCase()) {
          case 'obj':
            const objLoader = new OBJLoader();
            loadedModel = await objLoader.loadAsync(modelUrl);
            break;
          case 'stl':
            const stlLoader = new STLLoader();
            const geometry = await stlLoader.loadAsync(modelUrl);
            // STL loader returns geometry, need to create a mesh
            const material = new THREE.MeshStandardMaterial({ 
              color: 0xaaaaaa,
              metalness: 0.25,
              roughness: 0.6,
            });
            loadedModel = new THREE.Mesh(geometry, material);
            break;
          case 'ply':
            const plyLoader = new PLYLoader();
            const plyGeometry = await plyLoader.loadAsync(modelUrl);
            const plyMaterial = new THREE.MeshStandardMaterial({ 
              color: 0xaaaaaa,
              metalness: 0.25,
              roughness: 0.6,
            });
            loadedModel = new THREE.Mesh(plyGeometry, plyMaterial);
            break;
          case 'gltf':
          case 'glb':
            const gltfLoader = new GLTFLoader();
            const gltfResult = await gltfLoader.loadAsync(modelUrl);
            loadedModel = gltfResult.scene;
            break;
          default:
            console.error('Unsupported format:', fileFormat);
            return;
        }
        
        setModel(loadedModel);
        
        // Center and orient the model
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        loadedModel.position.sub(center);
        
        // Get model dimensions to position camera appropriately
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Position camera to view model from front-top-right angle
        const distance = maxDim * 2.5;
        camera.position.set(distance, distance * 0.8, distance);
        camera.lookAt(0, 0, 0);
        
        // Update orbit controls target if available
        const controls = scene.userData.controls;
        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        }
        
        // Store the loaded model and scene in the ref for exporting
        if (exportRef) {
          exportRef.current = {
            model: loadedModel,
            scene: scene
          };
        }
        
      } catch (error) {
        console.error("Error loading model:", error);
      }
    };
    
    loadModel();
  }, [modelUrl, fileFormat, scene, camera, exportRef]);

  if (!model) return null;
  return <primitive object={model} scale={1} />;
};

// Enhanced camera controls component that works with OrbitControls
const CameraControls = ({ controlsRef }) => {
  const { camera, scene } = useThree();
  const orbitRef = useRef();
  
  // Store orbit controls ref in the scene for access by ModelViewer
  React.useEffect(() => {
    if (orbitRef.current) {
      scene.userData.controls = orbitRef.current;
    }
  }, [scene, orbitRef]);
  
  // Store the camera and orbit controls in the ref for external access
  React.useEffect(() => {
    if (controlsRef) {
      controlsRef.current = {
        camera,
        orbitControls: orbitRef.current,
        zoomIn: () => {
          // Use camera zoom to move closer
          if (orbitRef.current) {
            // Get direction vector from camera to target
            const targetVector = new THREE.Vector3();
            orbitRef.current.target.clone(targetVector);
            
            // Calculate direction vector
            const direction = new THREE.Vector3();
            direction.subVectors(targetVector, camera.position).normalize();
            
            // Move camera along direction vector (towards target)
            const moveDistance = camera.position.distanceTo(targetVector) * 0.2;
            camera.position.addScaledVector(direction, moveDistance);
            
            orbitRef.current.update();
          }
        },
        zoomOut: () => {
          // Use camera zoom to move away
          if (orbitRef.current) {
            // Get direction vector from camera to target
            const targetVector = new THREE.Vector3();
            orbitRef.current.target.clone(targetVector);
            
            // Calculate direction vector
            const direction = new THREE.Vector3();
            direction.subVectors(targetVector, camera.position).normalize();
            
            // Move camera along direction vector (away from target)
            const moveDistance = camera.position.distanceTo(targetVector) * 0.2;
            camera.position.addScaledVector(direction, -moveDistance);
            
            orbitRef.current.update();
          }
        },
        rotateLeft: () => {
          if (orbitRef.current) {
            // Calculate the angle to rotate (in radians)
            const rotationAngle = 0.1;  // About 5.7 degrees
            
            // Create a rotation matrix around the Y axis (assuming Y is up)
            const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationAngle);
            
            // Get the current camera position as a vector
            const cameraPosition = new THREE.Vector3().copy(camera.position);
            
            // Apply rotation to the camera position vector
            cameraPosition.applyMatrix4(rotationMatrix);
            
            // Update camera position
            camera.position.copy(cameraPosition);
            
            // Make sure camera is still looking at the target
            camera.lookAt(orbitRef.current.target);
            
            // Update the controls
            orbitRef.current.update();
          }
        },
        rotateRight: () => {
          if (orbitRef.current) {
            // Calculate the angle to rotate (in radians)
            const rotationAngle = -0.1;  // About -5.7 degrees (negative for right)
            
            // Create a rotation matrix around the Y axis (assuming Y is up)
            const rotationMatrix = new THREE.Matrix4().makeRotationY(rotationAngle);
            
            // Get the current camera position as a vector
            const cameraPosition = new THREE.Vector3().copy(camera.position);
            
            // Apply rotation to the camera position vector
            cameraPosition.applyMatrix4(rotationMatrix);
            
            // Update camera position
            camera.position.copy(cameraPosition);
            
            // Make sure camera is still looking at the target
            camera.lookAt(orbitRef.current.target);
            
            // Update the controls
            orbitRef.current.update();
          }
        },
        topView: () => {
          // Set camera to top view
          const targetPosition = orbitRef.current.target;
          const distanceToTarget = camera.position.distanceTo(targetPosition);
          camera.position.set(targetPosition.x, targetPosition.y + distanceToTarget, targetPosition.z);
          camera.lookAt(targetPosition);
          orbitRef.current.update();
        },
        bottomView: () => {
          // Set camera to bottom view
          const targetPosition = orbitRef.current.target;
          const distanceToTarget = camera.position.distanceTo(targetPosition);
          camera.position.set(targetPosition.x, targetPosition.y - distanceToTarget, targetPosition.z);
          camera.lookAt(targetPosition);
          orbitRef.current.update();
        }
      };
    }
  }, [camera, controlsRef]);

  return <OrbitControls ref={orbitRef} />;
};

function App() {
  const [file, setFile] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("stl");
  const [currentFormat, setCurrentFormat] = useState("");
  const [filename, setFilename] = useState("");
  const controlsRef = useRef(null);
  const exportRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile) {
      // Extract the file extension to know the current format
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      setCurrentFormat(fileExtension);
      setFilename(selectedFile.name.split('.')[0]); // Store filename without extension
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file!");
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:5000/upload", formData);
      let encodedFilename = encodeURIComponent(res.data.filename);
      setModelUrl(`http://127.0.0.1:5000/models/${encodedFilename}`);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. Please try again.");
    }
    setLoading(false);
  };

  const handleExport = async () => {
    if (!exportRef.current || !exportRef.current.model) {
      alert("No model loaded to export");
      return;
    }
    
    if (currentFormat.toLowerCase() === exportFormat.toLowerCase()) {
      alert(`File is already in ${exportFormat.toUpperCase()} format.`);
      return;
    }
    
    setExporting(true);
    
    try {
      let result;
      const { model, scene } = exportRef.current;
      
      // Use the appropriate exporter based on the target format
      switch (exportFormat.toLowerCase()) {
        case "stl":
          const stlExporter = new STLExporter();
          result = stlExporter.parse(scene, { binary: true });
          downloadFile(result, `${filename}.stl`, "model/stl");
          break;
          
        case "obj":
          const objExporter = new OBJExporter();
          result = objExporter.parse(scene);
          downloadFile(new Blob([result], { type: "text/plain" }), `${filename}.obj`);
          break;
          
        case "ply":
          const plyExporter = new PLYExporter();
          plyExporter.parse(
            scene,
            (result) => {
              downloadFile(new Blob([result], { type: "text/plain" }), `${filename}.ply`);
            },
            { binary: false }
          );
          break;
          
        case "gltf":
          const gltfExporter = new GLTFExporter();
          gltfExporter.parse(
            scene,
            (result) => {
              const output = JSON.stringify(result, null, 2);
              downloadFile(new Blob([output], { type: "application/json" }), `${filename}.gltf`);
            },
            (error) => {
              console.error("GLTF Export Error:", error);
              alert("Failed to export as GLTF. Please try another format.");
            },
            { binary: false }
          );
          break;
          
        default:
          alert("Unsupported export format");
          break;
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export the model. Please try another format.");
    }
    
    setExporting(false);
  };

  // Helper function to download files
  const downloadFile = (content, fileName, contentType) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: contentType || "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Camera control functions using the ref
  const handleZoom = (zoomIn) => {
    if (controlsRef.current) {
      zoomIn ? controlsRef.current.zoomIn() : controlsRef.current.zoomOut();
    }
  };

  // Updated to use rotation instead of panning
  const handleRotate = (direction) => {
    if (controlsRef.current) {
      direction === "left" ? controlsRef.current.rotateLeft() : controlsRef.current.rotateRight();
    }
  };

  const handleTopDownView = () => {
    if (controlsRef.current) {
      controlsRef.current.topView();
    }
  };

  const handleBottomView = () => {
    if (controlsRef.current) {
      controlsRef.current.bottomView();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>3D Model Viewer</h1>
      </div>

      <div style={styles.contentContainer}>
        {/* Left side - Model Viewer */}
        <div style={styles.leftPanel}>
          {modelUrl ? (
            <div style={styles.viewerContainer}>
              <Canvas style={styles.canvas}>
                <CameraControls controlsRef={controlsRef} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <directionalLight position={[2, 2, 2]} intensity={0.8} />
                <ModelViewer 
                  modelUrl={modelUrl} 
                  exportRef={exportRef} 
                  fileFormat={currentFormat}
                />
              </Canvas>
            </div>
          ) : (
            <div style={styles.placeholderContainer}>
              <div style={styles.placeholderContent}>
                <i style={styles.placeholderIcon}>📦</i>
                <p style={styles.placeholderText}>Upload a 3D model to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Controls */}
        <div style={styles.rightPanel}>
          <div style={styles.controlSection} className="upload-section">
            <h3 style={styles.sectionTitle}>Upload Model</h3>
            <div style={styles.uploadBox}>
              <input 
                type="file" 
                onChange={handleFileChange} 
                style={styles.input} 
                accept=".obj,.stl,.ply,.glb,.gltf" 
                id="file-upload"
              />
              <label htmlFor="file-upload" style={styles.fileInputLabel}>
                Choose File
              </label>
              <span style={styles.fileName}>{file ? file.name : "No file chosen"}</span>
            </div>
            <button onClick={handleUpload} style={styles.button} disabled={loading}>
              {loading ? "Uploading..." : "Upload Model"}
            </button>
          </div>

          {modelUrl && (
            <>
              <div style={styles.controlSection} className="view-controls-section">
                <h3 style={styles.sectionTitle}>View Controls</h3>
                <div style={styles.controlsGrid}>
                  <button onClick={() => handleZoom(true)} style={{...styles.controlButton, ...styles.zoomInBtn}}>
                    <span style={styles.btnIcon}>🔍+</span>
                    <span>Zoom In</span>
                  </button>
                  <button onClick={() => handleZoom(false)} style={{...styles.controlButton, ...styles.zoomOutBtn}}>
                    <span style={styles.btnIcon}>🔍-</span>
                    <span>Zoom Out</span>
                  </button>
                  <button onClick={() => handleRotate("left")} style={{...styles.controlButton, ...styles.rotateLeftBtn}}>
                    <span style={styles.btnIcon}>↶</span>
                    <span>Rotate Left</span>
                  </button>
                  <button onClick={() => handleRotate("right")} style={{...styles.controlButton, ...styles.rotateRightBtn}}>
                    <span style={styles.btnIcon}>↷</span>
                    <span>Rotate Right</span>
                  </button>
                  <button onClick={handleTopDownView} style={{...styles.controlButton, ...styles.topViewBtn}}>
                    <span style={styles.btnIcon}>⇑</span>
                    <span>Top View</span>
                  </button>
                  <button onClick={handleBottomView} style={{...styles.controlButton, ...styles.bottomViewBtn}}>
                    <span style={styles.btnIcon}>⇓</span>
                    <span>Bottom View</span>
                  </button>
                </div>
              </div>
              
              <div style={styles.controlSection} className="export-section">
                <h3 style={styles.sectionTitle}>Export Model</h3>
                <div style={styles.formGroup}>
                  <div style={styles.infoRow}>
                    <label style={styles.label}>Current format: </label>
                    <span style={styles.formatBadge}>{currentFormat.toUpperCase()}</span>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label htmlFor="exportFormat" style={styles.label}>Convert to: </label>
                  <div style={styles.selectWrapper}>
                    <select
                      id="exportFormat"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      style={styles.select}
                      disabled={exporting}
                    >
                      <option value="obj">OBJ</option>
                      <option value="stl">STL</option>
                      <option value="ply">PLY</option>
                      <option value="gltf">GLTF</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleExport} 
                  style={styles.exportButton} 
                  disabled={exporting || currentFormat.toLowerCase() === exportFormat.toLowerCase()}
                >
                  {exporting ? "Converting..." : `Export as ${exportFormat.toUpperCase()}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "0",
    margin: "0",
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: "#1e1e2f",
    minHeight: "100vh",
    color: "#fff",
  },
  header: {
    background: "linear-gradient(135deg, #43cea2 0%, #185a9d 100%)",
    padding: "20px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
  },
  title: {
    fontSize: "42px",
    fontWeight: "700",
    margin: "0",
    fontFamily: "'Montserrat', sans-serif",
    textTransform: "uppercase",
    letterSpacing: "2px",
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
    background: "linear-gradient(to right, #fff, #d4e7ed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  contentContainer: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: "20px",
    padding: "20px",
  },
  leftPanel: {
    flex: "2",
    minWidth: "300px",
  },
  rightPanel: {
    flex: "1",
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  viewerContainer: {
    width: "100%",
    height: "calc(100vh - 140px)",
    borderRadius: "15px",
    overflow: "hidden",
    backgroundColor: "#181825",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  placeholderContainer: {
    width: "100%",
    height: "calc(100vh - 140px)",
    borderRadius: "15px",
    backgroundColor: "#181825",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  placeholderContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "15px",
  },
  placeholderIcon: {
    fontSize: "50px",
  },
  placeholderText: {
    color: "#888",
    fontSize: "18px",
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
  controlSection: {
    backgroundColor: "#2a2a3c",
    borderRadius: "15px",
    padding: "20px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  sectionTitle: {
    fontSize: "22px",
    marginTop: "0",
    marginBottom: "20px",
    borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
    paddingBottom: "10px",
    color: "#fff",
    fontFamily: "'Montserrat', sans-serif",
    letterSpacing: "1px",
  },
  uploadBox: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "15px",
  },
  input: {
    display: "none",
  },
  fileInputLabel: {
    padding: "12px 20px",
    backgroundColor: "#3498db",
    color: "white",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    textAlign: "center",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    ":hover": {
      backgroundColor: "#2980b9",
    },
  },
  fileName: {
    fontSize: "14px",
    color: "#ddd",
    padding: "5px 10px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "5px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    backgroundColor: "#ff7f50", // Coral
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    ":hover": {
      backgroundColor: "#e74c3c",
    },
  },
  controlsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  controlButton: {
    padding: "12px 10px",
    fontSize: "14px",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
  },
  btnIcon: {
    fontSize: "18px",
    marginBottom: "2px",
  },
  zoomInBtn: {
    backgroundColor: "#27ae60", // Green
  },
  zoomOutBtn: {
    backgroundColor: "#16a085", // Green Teal
  },
  rotateLeftBtn: {
    backgroundColor: "#9b59b6", // Purple
  },
  rotateRightBtn: {
    backgroundColor: "#8e44ad", // Dark Purple
  },
  topViewBtn: {
    backgroundColor: "#e67e22", // Orange
  },
  bottomViewBtn: {
    backgroundColor: "#d35400", // Dark Orange
  },
  formGroup: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    marginBottom: "8px",
    color: "#ddd",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  selectWrapper: {
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  select: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "white",
    border: "none",
    borderRadius: "10px",
    appearance: "none",
    outline: "none",
  },
  exportButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    backgroundColor: "#3498db", // Blue
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    ":hover": {
      backgroundColor: "#2980b9",
    },
  },
  formatBadge: {
    display: "inline-block",
    padding: "6px 12px",
    backgroundColor: "#2ecc71",
    color: "white",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
};

export default App;