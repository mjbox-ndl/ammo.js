import { useState, useRef } from 'react'

declare global {
  interface Window {
    ammoInstance: any;
    Ammo: any;
  }
}
import * as THREE from "three";

import { useEffect } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';


export function Bullet_Pole() {
  // const [count] = useState(0)
  const loadingCountRef = useRef(0);
  var camera, controls, renderer;
  var textureLoader;
  const clock = new THREE.Clock();
  var scene;
  var clickRequest = false;
  var mouseCoords = new THREE.Vector2();
  var raycaster = new THREE.Raycaster();
  const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  var pos = new THREE.Vector3();
  var quat = new THREE.Quaternion();

  var gravityConstant = -9.8;
  var collisionConfiguration;
  var dispatcher;
  var broadphase;
  var solver;
  var physicsWorld: any = null;
  var softBodies: any[] = [];
  var rigidBodies: any[] = [];
  var margin = 0.01;
  var hinge;
  var transformAux1;
  var softBodySolver;
  const coneList = [];
  var frame_count = 0;

  useEffect(() => {
    if (loadingCountRef.current === 0) {
        
      

      const init = async () => {

        const Ammo = await new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "/ammo.js";  // ✅ `public/ammo.js`에서 가져옴
            script.async = true;
            script.onload = () => resolve(window.Ammo);  // 전역 객체에서 가져오기
            document.body.appendChild(script);
        });

        window.ammoInstance = await (Ammo as any)(); // Ammo 초기화
        console.log("Ammo.js Loaded!", window.ammoInstance);
        transformAux1 = new window.ammoInstance.btTransform();

        initGraphics();

        initPhysics();
        
        createObjects();
        
        initInput();

        animate();

        document.getElementById('dynamicText')!.innerText = `FrameCount: ${frame_count}`;
        
      };
            
      const initGraphics = function () {

        camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );
        
        renderer = new THREE.WebGLRenderer();
        
        scene = new THREE.Scene();

        camera.position.x = 0;
        camera.position.y = 9;
        camera.position.z = 7;

        controls = new OrbitControls( camera, renderer.domElement );
        controls.target.y = 2;

        renderer.setClearColor( 0xbfd1e5 );
        renderer.setClearColor( 0x000000 );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.shadowMap.enabled = true;

        textureLoader = new THREE.TextureLoader();

        var ambientLight = new THREE.AmbientLight( 0x404040 );
        scene.add( ambientLight );

        var light = new THREE.DirectionalLight( 0xffffff, 1 );
        light.position.set( -10, 10, 5 );
        light.castShadow = true;
        var d = 20;
        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;

        light.shadow.camera.near = 2;
        light.shadow.camera.far = 50;

        light.shadow.mapSize.x = 1024;
        light.shadow.mapSize.y = 1024;

        const rgbeLoader = new RGBELoader();
        rgbeLoader.load("/textures/08.hdr", function (texture) {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          scene.environment = texture;
          scene.background = texture;
        });
        scene.add( light );

        document.body.appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize);

      } 
      const onWindowResize = function() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

      }

      const initPhysics = function () {

        const Ammo = window.ammoInstance;

        collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
        dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
        broadphase = new Ammo.btDbvtBroadphase();
        solver = new Ammo.btSequentialImpulseConstraintSolver();
        softBodySolver = new Ammo.btDefaultSoftBodySolver();
        physicsWorld = new Ammo.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
        physicsWorld.setGravity( new Ammo.btVector3( 0, gravityConstant, 0 ) );
        physicsWorld.getWorldInfo().set_m_gravity( new Ammo.btVector3( 0, gravityConstant, 0 ) );

      }

      const createSoftbody = function (pos={x:0, y:1.2, z:0},
        mass: number=20, kDP: number=0.95, kCHR: number=0.01, kKHR: number=0.5,
        stiffness: number=0.85, constraints: number=3) 
      {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          "/models/cylinder_blender.glb",
          (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.type == 'Mesh') {
                    child.geometry.scale(0.1, 0.1, 0.1);
                    child.geometry.translate( pos.x, pos.y, pos.z );
                    createSoftVolume( child.geometry, mass, kDP, kCHR, kKHR, stiffness, constraints, child.material );

                    const text = `Constraints: ${constraints}`;
                    const texture = createTextTexture(text);
                    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true }); // 투명 배경 유지
                    const geometry = new THREE.PlaneGeometry(2, 1);
                    const textPlane = new THREE.Mesh(geometry, material);
                    textPlane.position.copy(child.position).add(new THREE.Vector3(-0.8+pos.x, 1.1+pos.y, -4+pos.z));
                    scene.add(textPlane);
                    return;
                }
            })
          }
        )
      }
      const createObjects = function () {

        const Ammo = window.ammoInstance;

        pos.set( 0, - 0.5, 0 );
                quat.set( 0, 0, 0, 1 );
                var ground = createParalellepiped( 40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
        ground.castShadow = true;
                ground.receiveShadow = true;
                textureLoader.load( "/textures/grid.png", function( texture ) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set( 40, 40 );
                    ground.material.map = texture;
                    ground.material.needsUpdate = true;
                } );

        //// const geometry = new THREE.BoxGeometry(4, 1, 1, 12, 3, 3);
        // var geometry = new THREE.SphereGeometry( 1.5, 40, 25 );
        // geometry.translate( -4, 3, 0 );
        // createSoftVolume(geometry, 15, 1000 );
        // console.log(`Polycount (sphereGeometry) : ${geometry.index.count / 3}`);

        // createSoftbody({x: -3, y: 1.2, z: 0}, mass=20, kDP=0.95, kCHR=0.01, kKHR=0.5, stiffness=0.85, constraints=3);
        createSoftbody({x: -3, y: 1.12, z: 0}, 20, 0.95, 0.01,  0.95, 0.95, 1);
        createSoftbody({x:  0, y: 1.12, z: 0}, 20, 0.95, 0.01,  0.95, 0.95, 2);
        createSoftbody({x:  3, y: 1.12, z: 0}, 20, 0.95, 0.01,  0.95, 0.95, 3);

        pos.set( 0, 0.5, 0 );
        quat.set( 0, 0, 0, 1 );
      }

      const animate = function () {

        requestAnimationFrame(animate);
        render();

      };

      // 1. 캔버스를 사용하여 텍스트를 렌더링
      const createTextTexture = function (text, width = 256, height = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 배경을 투명하게 설정
        ctx.clearRect(0, 0, width, height);
        
        // 텍스트 스타일 설정
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#cccccc'; // 텍스트 색상
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 텍스트 그리기
        ctx.fillText(text, width / 2, height / 2);
        
        // Three.js Texture로 변환
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
      }

      const createParalellepiped = function( sx, sy, sz, mass, pos, quat, material ) {

        const Ammo = window.ammoInstance;

                var threeObject = new THREE.Mesh( new THREE.BoxGeometry( sx, sy, sz, 1, 1, 1 ), material );
                var shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
                shape.setMargin( margin );

                const body = createRigidBody( threeObject, shape, mass, pos, quat );
                body.setFriction(1.0)
                body.setRestitution(0.5)
                return threeObject;

      }

      const getMeshData = function(mesh) {

        const index = mesh.geometry.index !== null ? mesh.geometry.index : undefined;
        const attributes = mesh.geometry.attributes;
        const scale = mesh.scale;

        if (attributes.position === undefined) {

            console.error('getMeshData(): Position attribute required for conversion.');
            return;

        }

        const position = attributes.position;

        let vertices = [];
        let faces = [];

        for (let i = 0; i < position.count; i++) {

            vertices.push({
                x: scale.x * position.getX(i),
                y: scale.y * position.getY(i),
                z: scale.z * position.getZ(i)
            });

        }

        if (index !== undefined) {

            for (let i = 0; i < index.count; i += 3) {

                faces.push({
                    a: index.getX(i),
                    b: index.getX(i + 1),
                    c: index.getX(i + 2)
                });

            }

        } else {

            for (let i = 0; i < position.count; i += 3) {

                faces.push({
                    a: i,
                    b: i + 1,
                    c: i + 2
                });

            }
        }

        return {
            vertices,
            faces
        }
    }

    const createGImpactCollision = function(mesh, scale) {

      const Ammo = window.ammoInstance;

      let faces, vertices;
      let totvert = 0;

      if (mesh.isMesh) {
          let data = getMeshData(mesh);

          faces = data.faces;
          vertices = data.vertices;

          totvert = vertices.length;

      }
      else {
          console.error("cannot make mesh shape for non-Mesh object");
      }

      if (totvert == 0) {
          console.error("no vertices to define mesh shape with");
      }

      if (!scale)
          scale = { x: 1, y: 1, z: 1 };

      /* vertices, faces */
      let ammoMesh = new Ammo.btTriangleMesh();

      for (let i = 0, l = faces.length; i < l; i++) {
          let a = faces[i].a;
          let b = faces[i].b;
          let c = faces[i].c;
          ammoMesh.addTriangle(
              new Ammo.btVector3(vertices[a].x, vertices[a].y, vertices[a].z),
              new Ammo.btVector3(vertices[b].x, vertices[b].y, vertices[b].z),
              new Ammo.btVector3(vertices[c].x, vertices[c].y, vertices[c].z),
              false
          );
      }

      let triangleShape = new Ammo.btGImpactMeshShape(ammoMesh);
      triangleShape.setMargin(margin);
      triangleShape.setLocalScaling(new Ammo.btVector3(scale.x, scale.y, scale.z));
      triangleShape.updateBound();

      return triangleShape;

    }


      const render = function () {

        const deltaTime = clock.getDelta();

        // updatePhysics( deltaTime );

        processClick();

        controls.update( deltaTime );

        renderer.render(scene, camera);

      }

      const dropCone = function ( mass, pos ) {

        const Ammo = window.ammoInstance;

        const ballMass = mass;
        const ballRadius = 0.8;
        const ballHeight = 0.7;
        const Material = new THREE.MeshBasicMaterial({ color: 0xff0000});
        const ball = new THREE.Mesh( new THREE.ConeGeometry( ballRadius, ballHeight, 100 ), Material );
        // const ball = new THREE.Mesh( new THREE.BoxGeometry(ballRadius,ballRadius,ballRadius, 1,1,1), Material );
        ball.castShadow = true;
        ball.receiveShadow = true;
        quat.set( 0, 0, 0, 1 );
        quat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI+0.02);
        // quat.setFromAxisAngle(new THREE.Vector3(1, 0, 1), Math.PI*0.5);

        const ballShape = new Ammo.btConeShape( ballRadius*1, ballHeight*1 );
        // const ballShape = new Ammo.btBoxShape(  new Ammo.btVector3(ballRadius,ballRadius,ballRadius) );
        
        ballShape.setMargin( margin );
        const localInertia = new Ammo.btVector3( 0, 0, 0 );
        ballShape.calculateLocalInertia( ballMass, localInertia );
        
        const ballBody = createRigidBody( ball, ballShape, ballMass, pos, quat );

        ballBody.setFriction(0.5)
        ballBody.setRestitution(0.5)
        ballBody.setRollingFriction(0.5)
        ballBody.setCcdSweptSphereRadius(0.05)
        ballBody.setCcdMotionThreshold(0.01)
        coneList.push(ball);
      }

      const dropCone2 = function ( mass, pos ) {

        const gltfLoader = new GLTFLoader();
            gltfLoader.load(
              "/models/cone_blender.glb",
              (gltf) => {
                // scene.add(gltf.scene);
                gltf.scene.rotation.z = Math.PI;
                gltf.scene.traverse((child) => {
                    if (child.type == 'Mesh') {
                      // pos.copy(gltf.scene.position);
                      quat.copy(gltf.scene.quaternion);
                      child.geometry.scale(0.2, 0.2, 0.2);
                      const ballShape = createGImpactCollision(child, { x: 1, y: 1, z: 1 });
                      ballShape.setMargin( margin );
                      quat.set( 0, 0, 0, 1 );
                      quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
                      const ballBody = createRigidBody( child, ballShape, mass, pos, quat );
                      ballBody.setFriction(0.1)
                      ballBody.setRestitution(0.5)
                      ballBody.setRollingFriction(0.5)
                      ballBody.setCcdSweptSphereRadius(0.05)
                      ballBody.setCcdMotionThreshold(0.01)

                      coneList.push(child);
                      return;
                    }
                })
              }
            )
      }

      const initInput = function () {
        window.addEventListener( 'mousedown', function( event ) {
          if ( ! clickRequest ) {
            if (event.button === 2) {
              mouseCoords.set(
                  ( event.clientX / window.innerWidth ) * 2 - 1,
                  - ( event.clientY / window.innerHeight ) * 2 + 1
              );
              clickRequest = true;
              console.log(mouseCoords);
            }
          }
        }, false );


        window.addEventListener('keydown', function(event) {
          console.log(`${event.key} key pressed`);
          pos = new THREE.Vector3(0.4, 6, -2);
          // pos = new THREE.Vector3(0.3, 6, 0);
          if (event.key === '1') {
            dropCone2(0.2, pos);
          }
          else if (event.key === '2') {
            dropCone(1.5, new THREE.Vector3(-2.6, 5, -2));
            dropCone(1.5, new THREE.Vector3(0.4, 5, -2));
            dropCone(1.5, new THREE.Vector3(3.4, 5, -2));
          }
          else if (event.key === '3') {
            dropCone2(1, pos);
          }
          else if (event.key === '4') {
            updatePhysics( 0.05 );
            frame_count++;
            document.getElementById('dynamicText')!.innerText = `FrameCount: ${frame_count}`;
          }
          else if (event.key === '5') {
            for (let i = 0; i < coneList.length; i++) {
              coneList[i].visible = !coneList[i].visible;
            }
          }
          else if (event.key === '6') {
            camera.position.x = 0;
            camera.position.y = 9;
            camera.position.z = 7;

          }
        });

      };

      const processClick = function() {

        const Ammo = window.ammoInstance;

        if ( clickRequest && Ammo ) {

            raycaster.setFromCamera( mouseCoords, camera );

            // Creates a ball
            var ballMass = 0.03;
            var ballRadius = 0.4;

            var ball = new THREE.Mesh( new THREE.SphereGeometry( ballRadius, 18, 16 ), ballMaterial );
            ball.castShadow = true;
            ball.receiveShadow = true;
            var ballShape = new Ammo.btSphereShape( ballRadius );
            ballShape.setMargin( margin );
            pos.copy( raycaster.ray.direction );
            pos.add( raycaster.ray.origin );
            quat.set( 0, 0, 0, 1 );
            var ballBody = createRigidBody( ball, ballShape, ballMass, pos, quat );
            ballBody.setFriction( 0.5 );

            pos.copy( raycaster.ray.direction );
            pos.multiplyScalar( 14 );
            ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );

            clickRequest = false;

        }

      }

      const createRigidBody = function( threeObject, physicsShape, mass, pos, quat ) {
        const Ammo = window.ammoInstance;

        threeObject.position.copy( pos );
        threeObject.quaternion.copy( quat );

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
        transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
        var motionState = new Ammo.btDefaultMotionState( transform );

        var localInertia = new Ammo.btVector3( 0, 0, 0 );
        physicsShape.calculateLocalInertia( mass, localInertia );

        var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
        var body = new Ammo.btRigidBody( rbInfo );
        threeObject.userData.physicsBody = body;

        scene.add( threeObject );

        if ( mass > 0 ) {
          rigidBodies.push( threeObject );

          // Disable deactivation
          body.setActivationState( 4 );
        }

        physicsWorld.addRigidBody( body );

        return body;
      }

      const updatePhysics = function ( deltaTime: number ) {

        if ( ! physicsWorld ) return;

        // // Step world
        physicsWorld.stepSimulation( deltaTime, 100 );
        // Update soft volumes
        for ( var i = 0, il = softBodies.length; i < il; i++ ) {
            var volume = softBodies[ i ];
            var geometry = volume.geometry;
            var softBody = volume.userData.physicsBody;
            var volumePositions = geometry.attributes.position.array;
            var volumeNormals = geometry.attributes.normal.array;
            var association = geometry.ammoIndexAssociation;
            var numVerts = association.length;
            var nodes = softBody.get_m_nodes();
            for ( var j = 0; j < numVerts; j ++ ) {

                var node = nodes.at( j );
                var nodePos = node.get_m_x();
                var x = nodePos.x();
                var y = nodePos.y();
                var z = nodePos.z();
                var nodeNormal = node.get_m_n();
                var nx = nodeNormal.x();
                var ny = nodeNormal.y();
                var nz = nodeNormal.z();

                var assocVertex = association[ j ];

                for ( var k = 0, kl = assocVertex.length; k < kl; k++ ) {
                    var indexVertex = assocVertex[ k ];
                    volumePositions[ indexVertex ] = x;
                    volumeNormals[ indexVertex ] = nx;
                    indexVertex++;
                    volumePositions[ indexVertex ] = y;
                    volumeNormals[ indexVertex ] = ny;
                    indexVertex++;
                    volumePositions[ indexVertex ] = z;
                    volumeNormals[ indexVertex ] = nz;
                }
            }

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.normal.needsUpdate = true;
          }
          // Update rigid bodies
          for ( var i = 0, il = rigidBodies.length; i < il; i++ ) {
            var objThree = rigidBodies[ i ];
            var objPhys = objThree.userData.physicsBody;
            var ms = objPhys.getMotionState();
            if ( ms ) {

              ms.getWorldTransform( transformAux1 );
              var p = transformAux1.getOrigin();
              var q = transformAux1.getRotation();
              objThree.position.set( p.x(), p.y(), p.z() );
              objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

            }
          }
      }

      const createIndexedBufferGeometryFromGeometry = function ( geometry: any ) {
        const numVertices = geometry.attributes.position.count;
        const numFaces = geometry.index.count / 3;

        const bufferGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array( numVertices * 3 );
        const indices = new ( numFaces * 3 > 65535 ? Uint32Array : Uint16Array )( numFaces * 3 );

        for ( let i = 0; i < numVertices; i++ ) {
          vertices[ i * 3 ] = geometry.attributes.position.array[ i * 3 ];
          vertices[ i * 3 + 1 ] = geometry.attributes.position.array[ i * 3 + 1 ];
          vertices[ i * 3 + 2 ] = geometry.attributes.position.array[ i * 3 + 2 ];
        }
        for ( let i = 0; i < numFaces; i++ ) {
          indices[ i * 3 ] = geometry.index.array[ i * 3 ];
          indices[ i * 3 + 1 ] = geometry.index.array[ i * 3 + 1 ];
          indices[ i * 3 + 2 ] = geometry.index.array[ i * 3 + 2 ];
        }
        bufferGeometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
        bufferGeometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        return bufferGeometry;
      }
      const isEqual = function ( x1:any, y1:any, z1:any, x2:any, y2:any, z2:any ) {
        var delta = 0.000001;
        return Math.abs( x2 - x1 ) < delta &&
                Math.abs( y2 - y1 ) < delta &&
                Math.abs( z2 - z1 ) < delta;
      }
      
      const mapIndices = function ( bufGeometry: any, indexedBufferGeom: any ) {
        
        // Creates ammoVertices, ammoIndices and ammoIndexAssociation in bufGeometry
        
        var vertices = bufGeometry.attributes.position.array;
        var idxVertices = indexedBufferGeom.attributes.position.array;
        var indices = indexedBufferGeom.index.array;

        var numIdxVertices = idxVertices.length / 3;
        var numVertices = vertices.length / 3;

        bufGeometry.ammoVertices = idxVertices;
        bufGeometry.ammoIndices = indices;
        bufGeometry.ammoIndexAssociation = [];

        for ( var i = 0; i < numIdxVertices; i++ ) {

            var association: number[] = [];
            bufGeometry.ammoIndexAssociation.push( association );

            var i3 = i * 3;

            for ( var j = 0; j < numVertices; j++ ) {
                var j3 = j * 3;
                if ( isEqual( idxVertices[ i3 ], idxVertices[ i3 + 1 ],  idxVertices[ i3 + 2 ],
                              vertices[ j3 ], vertices[ j3 + 1 ], vertices[ j3 + 2 ] ) ) {
                    association.push( j3 );
                }
            }
        }
      }
      
      const mergeVertices2 = function ( geometry: any, precisionPoints: any = 4 ) {

        const verticesMap = {}; // Hashmap for looking up vertices by position coordinates (and making sure they are unique)
        const unique = [], changes = [];

        const precision = Math.pow( 10, precisionPoints );

        const vertices = geometry.attributes.position;
        const uvArray = geometry.attributes.uv.array; // uv 배열 가져오기

        for ( let i = 0, il = vertices.count; i < il; i ++ ) {

          const v = {
            x: vertices.array[ i * 3 ],
            y: vertices.array[ i * 3 + 1 ],
            z: vertices.array[ i * 3 + 2 ]
          };
          const key = Math.round( v.x * precision ) + '_' + Math.round( v.y * precision ) + '_' + Math.round( v.z * precision );

          if ( verticesMap[ key ] === undefined ) {
    
            verticesMap[ key ] = i;
            unique.push( v.x, v.y, v.z );
            changes[ i ] = unique.length/3 - 1;

          } else {
    
            // console.log('Duplicate vertex found. ', i, ' could be using ', verticesMap[key]);
            changes[ i ] = changes[ verticesMap[ key ] ];
    
          }
        }
        console.log(vertices.count, unique.length/3);
        // 3111 -> 2942, old version unique == 2942
        
        // if faces are completely degenerate after merging vertices, we
        // have to remove them from the geometry.
        const faceIndicesToRemove = [];
        const faceArray = [];
        const numFaces = geometry.index.count / 3;
        const indexArray = geometry.index.array; // 인덱스 배열 가져오기
        console.log(indexArray[3], indexArray[4], indexArray[5]);
        console.log(changes[indexArray[3]], changes[indexArray[4]], changes[indexArray[5]]);
        for ( let i = 0, il = numFaces; i < il; i ++ ) {

          const face = {
            a: indexArray[ i * 3 ],
            b: indexArray[ i * 3 + 1 ],
            c: indexArray[ i * 3 + 2 ]
          };

          face.a = changes[ face.a ];
          face.b = changes[ face.b ];
          face.c = changes[ face.c ];

          const indices = [ face.a, face.b, face.c ];
          // if any duplicate vertices are found in a Face3
          // we have to remove the face as nothing can be saved
          for ( let n = 0; n < 3; n ++ ) {
            
            if ( indices[ n ] === indices[ ( n + 1 ) % 3 ] ) {
              faceIndicesToRemove.push( i );
              break;

            }

          }

          faceArray.push( face.a, face.b, face.c );
        }


        for ( let i = faceIndicesToRemove.length - 1; i >= 0; i -- ) {

          const idx = faceIndicesToRemove[ i ];

          // Remove the face by setting its indices to -1
          faceArray[ idx * 3 ] = -1;
          faceArray[ idx * 3 + 1 ] = -1;
          faceArray[ idx * 3 + 2 ] = -1;

          // Remove corresponding UVs
          uvArray[ idx * 2 ] = -1;
          uvArray[ idx * 2 + 1 ] = -1;
        }

        // // Filter out the removed indices and UVs
        console.log("faceIndicesToRemove", faceIndicesToRemove.length);
        indexArray.filter(index => index !== -1);
        uvArray.filter(uv => uv !== -1);
    
        // // // Use unique set of vertices
    
        // // const diff = geometry.vertices.length - unique.length;
        // geometry.attributes.position.array = unique;

        geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvArray), 2));
        geometry.setIndex(faceArray);
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(unique), 3));

        return geometry;
      }

      const processGeometry = function ( bufGeometry ) {
        
        // Obtain a Geometry
        // var geometry = new THREE.Geometry().fromBufferGeometry( bufGeometry );
        // var geometry = bufGeometry;
        console.log("Before merging:", bufGeometry.attributes.position.count); // 원래 정점 개수

        // Merge the vertices so the triangle soup is converted to indexed triangles
        mergeVertices2(bufGeometry);
        // const bufGeometry2 = mergeVertices(bufGeometry, 0.2);

        console.log("After merging:", bufGeometry.attributes.position.count); // 병합 후 정점 개수


        // Convert again to BufferGeometry, indexed
        var indexedBufferGeom = createIndexedBufferGeometryFromGeometry( bufGeometry );

        // Create index arrays mapping the indexed vertices to bufGeometry vertices
        mapIndices( bufGeometry, indexedBufferGeom );
        
        return bufGeometry
      }

      const createSoftVolume = function ( geometry,  
        mass: number, kDP: number, 
        kCHR: number = 0.01, kKHR: number = 0.5, stiffness: number = 0.85, constraints: number = 3, 
        material: any = null 
      ){
        const Ammo = window.ammoInstance;

        geometry = processGeometry( geometry );

        if ( ! material ) {
        // if ( true ) {
          material = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, wireframe: true } );
        }
        const volume = new THREE.Mesh(geometry, material );
        volume.castShadow = true;
        volume.receiveShadow = true;
        volume.frustumCulled = false;
        scene.add(volume);
        volume.material.needsUpdate = true;
        var softBodyHelpers = new Ammo.btSoftBodyHelpers();

        var info = physicsWorld.getWorldInfo();
        // info.set_m_gravity( new Ammo.btVector3( 0, 0, 0 ) );
        var volumeSoftBody = softBodyHelpers.CreateFromTriMesh(
          info,
          geometry.ammoVertices,
          geometry.ammoIndices,
          geometry.ammoIndices.length / 3,
          true );

        volumeSoftBody.generateBendingConstraints( constraints, volumeSoftBody.get_m_materials().at( 0 ) );

        var sbConfig = volumeSoftBody.get_m_cfg();
        sbConfig.set_viterations( 40 );
        sbConfig.set_piterations( 40 );
        // sbConfig.set_diterations( 10 );
        // sbConfig.set_citerations( 10 );

        // Soft-soft and soft-rigid collisions
        // SDF_RS 0x01 : Soft-Rigid Signed Distance Field 충돌
        // CL_RS  0x02 : Soft-Rigid Cluster 충돌
        // CL_SS  0x04 : Soft-Soft Cluster 충돌 (self-collision 관련)	
        // VF_SS  0x08 : Soft-Soft Vertex-Face 충돌 (self-collision 관련)	
        // VF_RS  0x10 : Soft-Rigid Vertex-Face 충돌	
        sbConfig.set_collisions( 0x11 );
        sbConfig.set_kVCF( 0.0 );
        // Friction
        sbConfig.set_kDF( 0.1 );
        // Damping
        sbConfig.set_kDP( kDP );
        sbConfig.set_kMT( 0.0 );
        // Pressure
        // sbConfig.set_kPR( pressure );
        // sbConfig.set_kPR( 1011 );
        // sbConfig.set_kVC( 0.9 );
        sbConfig.set_kPR( 0 );
        sbConfig.set_kVC( 0 );
        sbConfig.set_kCHR( kCHR );
        sbConfig.set_kKHR( kKHR );
        // Stiffness
        volumeSoftBody.get_m_materials().at( 0 ).set_m_kLST( stiffness );
        volumeSoftBody.get_m_materials().at( 0 ).set_m_kAST( stiffness );
        volumeSoftBody.get_m_materials().at( 0 ).set_m_kVST( stiffness );
        // volumeSoftBody.get_m_materials().at( 0 ).set_m_kKHR( stiffness );

        // volumeSoftBody.setMess(1, 0);
        volumeSoftBody.setTotalMass( mass, false );
        Ammo.castObject( volumeSoftBody, Ammo.btCollisionObject ).getCollisionShape().setMargin( 0.01 );
        // Ammo.castObject( volumeSoftBody, Ammo.btCollisionObject ).setCcdMotionThreshold( 0.01 );
        // Ammo.castObject( volumeSoftBody, Ammo.btCollisionObject ).setCcdSweptSphereRadius( 0.01 );

        physicsWorld.addSoftBody( volumeSoftBody, 1, -1 );
        volume.userData.physicsBody = volumeSoftBody;
        
        volumeSoftBody.setActivationState( 4 );
        
        softBodies.push( volume );
        return volume;
      }

      init();

    }

    loadingCountRef.current++;
  }, []);

  return (
    <>
      <div style={{ position: 'absolute', top: '70px', left: '80px', color: 'white', zIndex: 1, backgroundColor: '#333333', textAlign: 'left' }}>
        <p id="dynamicText" style={{ margin: '10px' }}>FrameCount: </p>
      </div>
      <div>
      </div>
    </>
  )
}


