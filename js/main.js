var threexAR;
var markersOnPage = 5; //Total markers on the page @nehil..change to 2-3

// setup three.js renderer
var renderer = new THREE.WebGLRenderer({
    antialias:true
});

renderer.setSize(320 * 2.5, 240 * 2.5);

renderer.setFaceCulling(0);
renderer.autoClear = false;

jQuery("#mainWindow").html(renderer.domElement);

// create the scene
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.set(0, 0, 5);
scene.add(camera);

// Lights

var ambient = new THREE.AmbientLight( 0x050505 );
scene.add( ambient );

directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
directionalLight.position.set( 2, 1.2, 10 ).normalize();
scene.add( directionalLight );

directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set( -2, 1.2, -10 ).normalize();
scene.add( directionalLight );

//////////////////////////////////////////////////////////////////////////////////
//																				//
//////////////////////////////////////////////////////////////////////////////////

// create the video element for the webcam
var videoEl = document.createElement('video');
videoEl.width = 320;
videoEl.height = 240;
videoEl.loop = true;
videoEl.volume = 0;
videoEl.autoplay = true;
videoEl.controls = false;

// sanity check - if the API available
if (!navigator.getUserMedia)    throw new Error("navigator.getUserMedia not found.");
if (!window.URL)        throw new Error("window.URL not found.");
if (!window.URL.createObjectURL)    throw new Error("window.URL.createObjectURL not found.");
navigator.getUserMedia({video:true}, function (stream) {
    videoEl.src = window.URL.createObjectURL(stream);
}, function (error) {
    alert("Couldn't access webcam.");
});
var threshold = 125;
var srcElement = videoEl;

// update the UI


//////////////////////////////////////////////////////////////////////////////////
//																				//
//////////////////////////////////////////////////////////////////////////////////
var videoTex;
var videoCam, videoScene;

// Create scene and quad for the video. @nehil..might need to change something here...didn't understand whats happening
videoTex = new THREE.Texture(srcElement);
var geometry = new THREE.PlaneGeometry(2, 2, 0);
var material = new THREE.MeshBasicMaterial({
    map:videoTex,
    depthTest:false,
    depthWrite:false
});
var plane = new THREE.Mesh(geometry, material);
videoScene = new THREE.Scene();
videoCam = new THREE.Camera();
videoScene.add(plane);
videoScene.add(videoCam);

//////////////////////////////////////////////////////////////////////////////////
//																				//
//////////////////////////////////////////////////////////////////////////////////


function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {

    if (srcElement instanceof HTMLImageElement) {
        videoTex.needsUpdate = true;
        threexAR.update();
    } else if (srcElement instanceof HTMLVideoElement && srcElement.readyState === srcElement.HAVE_ENOUGH_DATA) {
        videoTex.needsUpdate = true;
        threexAR.update();
    }

    // trigger the rendering
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(videoScene, videoCam);
    renderer.render(scene, camera);
}

//Start globale vars
var currentMarkers = new Array();
var currentMarkersCoverChecked = new Array();
var bigmarker = "blah";
var newModelFlag = 0;
var count = 1;

(function ($) {
    $(document).ready(function () {
        $("#thresholdRange").on("change", function () {
            $("#thresholdText").text(this.value);
            threexAR._threshold = this.value;
            console.log("thresholdRange", this.value);
        });

        

        var markers = {};

		//ON CREATE
        var onCreate = function (event) {
            console.log("Inside onCreate with event: ", event);
            console.assert(markers[event.markerId] === undefined);
            console.log("markers", markers);
            var markerId = event.markerId;
            markers[markerId] = {};

            var marker = markers[markerId];
            console.log("marker and markerId", marker,markerId);
            // create the container object @nehil--didn't understand code (duc)
            marker.object3d = new THREE.Object3D();
            marker.object3d.matrixAutoUpdate = false;
            scene.add(marker.object3d);

            //UPDATE ARRAY HOLDING CURRENT MARKERS
           
            var idx = currentMarkers.indexOf(event.markerId); // Find the index
            console.log("currentMarkers"+currentMarkers+" and idx value ", idx );
            if(idx==-1) // if does not exist
                {
                    currentMarkers.push(event.markerId);
                    console.log("currentMarkers", currentMarkers);
                }

            var marker = markers[markerId];
            console.log("markers[markerId]:", markers[markerId]);
			//If the big main marker is the first (back) seen: loading 3d model
            if (event.markerId == 0){
                //showNewModel(marker);
            }
            
			//test
            if (true) {

                if(count++ % 2 == 0){
                    var color_val = 0xf20909;
                }
                else{
                    var color_val = 0x1ed467;
                }
                

                var material = new THREE.MeshLambertMaterial({color:color_val});
                var geometry = new THREE.SphereGeometry( 40, 32, 16 );
                var mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.x = Math.PI / 3;
                mesh.rotation.z = -Math.PI / 10;
                mesh.position.x = 5;
                mesh.position.y = 5;
                mesh.position.z = -50;
                mesh.doubleSided = true;
                marker.object3d.add(mesh);
            }

        };
		
		//ON DELETE
        var onDelete = function (event) {

            console.assert(markers[event.markerId] !== undefined);
            var markerId = event.markerId;
            //UPDATE ARRAY HOLDING CURRENT MARKERS
            console.log("ON DELETE");
            
            removeByValue(currentMarkers, markerId);
           
		   //Start checking for cover (marker had disappeared) if not already in progress.
            var idxxx = currentMarkersCoverChecked.indexOf(markerId); // Find the index
                if(idxxx == -1) // if does NOT exist, so if not being checked
                    checkMarkerCovered(markerId);
            var marker = markers[markerId];
            scene.remove(marker.object3d);
            delete markers[markerId];


				
        };
		
		//ON UPDATE
        var onUpdate = function (event) {
		
            console.assert(markers[event.markerId] !== undefined);
            var markerId = event.markerId;
            var marker = markers[markerId];
			//New model should be shown?
			//No: update the current model of tranformatiematrix
            if(newModelFlag == 0)
            {
                marker.object3d.matrix.copy(event.matrix);
                marker.object3d.matrixWorldNeedsUpdate = true;
            }
            else
            {
			//Yes: Remove old model and generate new model
                scene.remove(marker.object3d);
                marker.object3d = new THREE.Object3D();
                marker.object3d.matrixAutoUpdate = false;
                scene.add(marker.object3d);
                //showNewModel(marker);
                newModelFlag = 0;
            }
        };

        function removeByValue(arr, val) {
            for(var i=0; i<arr.length; i++) {
                if(arr[i] == val) {
                    arr.splice(i, 1);
                    break;
                }
            }
        }

		
		//See if there is a single marker is missing, and start the sequence that checks whether a marker is covered (delay check)
        function checkMarkerCovered(markerId) {
          
            if(currentMarkers.length == markersOnPage-1)
            {
                console.log("Starting cover check on " + markerId);
                currentMarkersCoverChecked.push(markerId)
                var count = 0;
                delayCheck(markerId, count)
            }
        }

		//Feature that periodically checks whether the marker is still (only) covered.
		//After 10 controls we propose a fixed cover. For a single error is stopped checking.
        function delayCheck(markerId, count)
        {
			//Still covered only...
            if(currentMarkers.length == markersOnPage-1 && currentMarkers.indexOf(markerId) == -1)
            {
				//10x timeout functie die zichzelf aanlroept (recursief)
                if(count < 10)
                {
                    console.log("Marker: " + markerId + "  -  Count: " + count);
                    count++;
                    setTimeout(function(){ delayCheck(markerId, count) }, 100);
                }
                else
                {
					//Cover is gebeurd: start het wisselen van main groot model
                    console.log("MARKER " + markerId + " WAS COVERED!!!");
                    switchModel(markerId);
                    console.log("Model with id:  " + markerId + " updated!!!");
                    //remove from the being-checked array
                    var idx = currentMarkersCoverChecked.indexOf(markerId)
                    currentMarkersCoverChecked.splice(idx, 1);
                }
            }
            else
            {
			//Controle was negatief
                console.log("Covering check stopped...");
                //remove from the being-checked array
                var idx = currentMarkersCoverChecked.indexOf(markerId)
                currentMarkersCoverChecked.splice(idx, 1);
            }
        }


        threexAR = new THREEx.JSARToolKit({
            srcElement:srcElement,
            threshold:threshold,
            debug:false,
            callback:function (event) {
              
                if (event.type === 'create') {
                    onCreate(event);
                } else if (event.type === 'delete') {
                    onDelete(event);
                } else if (event.type === 'update') {
                    onUpdate(event);
                } else console.assert(false, "invalid event.type " + event.type);
            }
        });



        // start the animation
        animate();



    })
})(jQuery);