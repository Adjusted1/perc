// todo: bluetoooth scatternet master/slave needs implementation?
// alternativvely, bcast all gps blu names and periodically set blu name to history for upload and local blutooth range broadcaset:
//    time0:  gps(a) <---> gps(b) <---> gps(c)     hist(a) = a 
//    time1:  gps(b) <---> gps(c) <---> gps(b)     hist(a) = a,b 
//    time2:  gps(a,b)     gps(b) <---> gps(c)     hist(a) BCAST
//    start over at time 0 
// 
// todo: show history button + upload to gps server button
//

(function () {
    //
    // region vars
    // "use strict"; no is default
    var device_names = {};   // key value pair
    var broadCastHist = {};  // what type?
    var thisAddr = '';
    var firstRun = null;
    var disaster = 1; // set to 1 when disaster msgs/events detected
    var master = 0; // default as bluetooth ad-hoc slave device

    //var cnt = 0; // number msgs in recv window

    document.addEventListener('deviceready', onDeviceReady.bind(this), false);
    //function testLZString() {
    //    var string = "This is my compression test.";
    //    alert("Size of sample is: " + string.length);
    //    var compressed = LZString.compress(string);
    //    alert("Size of compressed sample is: " + compressed.length);
    //    string = LZString.decompress(compressed);
    //    alert("Sample is: " + string);
    //}
    function onDeviceReady() {
        GPSinit();
        localPhysicalAddr();      
        setupTasks();
        while (disaster != 1) {
            pollForDisaster();
        }
        turnBluOn(setThisBeaconMsg(makeThisPublic(getOtherTeeth())));
        (function () {
            setInterval(switchWithPeer, 5000);
        })();
        // #region future
        //(function () {
        //    setInterval(switchWithPeer, 1000);
        //})();       
        //// take commented out code put in "onExit()" type event --->
        //// ---> try {
        ////    // enable run in background mode
        ////    cordova.plugins.backgroundMode.enable();
        ////    // prevent exit
        ////    cordova.plugins.backgroundMode.overrideBackButton();
        ////    // remove from tasks list
        ////    cordova.plugins.backgroundMode.excludeFromTaskList();
        ////}
        ////catch (error) { navigator.notification.alert('background run function(s) error: ' + error); }
        // #endregion
    }

    function setupTasks() {
        // TODO: Cordova has been loaded. Perform any initialization that requires Cordova here.
        //var parentElement = document.getElementById('deviceready');
        ////var listeningElement = parentElement.querySelector('.listening');
        //var receivedElement = parentElement.querySelector('.received');
        //listeningElement.setAttribute('style', 'display:none;');
        //receivedElement.setAttribute('style', 'display:block;');
        var permissions = cordova.plugins.permissions;
        // perms req android 6
        var list = [
            permissions.CAMERA,
            permissions.GET_ACCOUNTS,
            //permissions.BLUETOOTH,
            //permissions.BLUETOOTH_ADMIN,
            permissions.ACCESS_COARSE_LOCATION,
            permissions.ACCESS_FINE_LOCATION,
            permissions.INTERNET,
            permissions.ACCESS_LOCATION_EXTRA_COMMANDS,
            permissions.ACCESS_NETWORK_STATE,
            permissions.ACCESS_NOTIFICATION_POLICY,
            permissions.ACCESS_WIFI_STATE,
            permissions.BROADCAST_STICKY,
            permissions.CHANGE_NETWORK_STATE,
            permissions.CHANGE_WIFI_MULTICAST_STATE,
            permissions.CHANGE_WIFI_STATE,
            permissions.KILL_BACKGROUND_PROCESSES,
            permissions.NFC,
            permissions.READ_SYNC_SETTINGS,
            permissions.READ_SYNC_STAT
        ];
        //permissions.requestPermission(list, success, error);
        permissions.hasPermission(list, null, null); // deprecated, but it takes a list...does updated API take list obj?

        var cook = window.localStorage;
        firstRun = cook.getItem("firstRun");
        if (firstRun === 1) {
            navigator.notification.alert('firstrun!, addr= ' + thisAddr);
            //localPhysicalAddr();
            //navigator.notification.alert('tried to write div prop');

        }
        else { // includes firstrun = null
            firstRun = 0;
            cook.setItem("firstRun", "0")
            //document.getElementById("me").innerHTML = cook.gps;
            // in plain js
            //document.getElementById('body').style.display = 'none';
            //document.getElementById('body').style.display = 'block';
            //navigator.notification.alert('tried to write div prop');
        }

    }
    function switchWithPeer() {
        // time2 stage history bcast (see top of this/index.js)
        bluetoothSerial.setName(broadCastHist); // object[history] undefined error
        for (var key in broadCastHist) {
            document.getElementById("out").innerHTML += broadCastHist[key];
        }
        
        //(function () {
        //    setInterval({}, 1000);
        //})();
        if (disaster === 1) {
            //document.getElementById("me").innerHTML = thisAddr;
            getOtherTeeth();
            var chosen = 0;
            while (chosen !== 1) {
                //choose slave, if none are master, otherwise make this the master
                var picked = decideBeacon(countProperties(device_names));
                var cnt = 0;
                for (var key in device_names) { // key is mac aa::bb::cc:: etc and val = bluetooth_name
                    if (device_names.hasOwnProperty(key)) {
                        if (picked === cnt) {
                            chosen = 1;
                            document.getElementById("out").innerHTML += device_names[picked];
                            bluetoothSerial.setName(device_names[picked]);
                            broadCastHist[key] += device_names[picked];
                        }
                        cnt++;
                    }
                }
                //var x = document.getElementById("out").innerHTML
                //x = Array.from(new Set(x.split(','))).toString()
                //document.getElementById("out").innerHTML += x;
                //navigator.notification.alert("uploading gps data collection from self and neighbors: " + x);
            }
        }
        var storage2 = window.localStorage;
        storage2.setItem("history", broadCastHist);
        uploadToGPSsite();
    }    
    function localPhysicalAddr() {
        if (firstRun == 1) {
            navigator.notification.prompt(
                'Enter your address into the window. Your GPS coords will be added as well. \n Also, Are you a First Responder? (if Yes, you will collect unique emergency requests on your device)',  // message
                onPrompt,                  // callback to invoke
                'For First Responders',    // title
                ['Yes', 'No']              // buttonLabels
            );
            function onPrompt(results) { // when not firstreposnderr addr is blank on refresh
                if (results.buttonIndex == 1) {
                    var responderCook = window.localStorage;
                    var addrCook = window.localStorage;
                    responderCook.setItem("isResponder", "1");
                    addrCook.setItem("addr", thisAddr + results.input1);
                    
                }
                else {
                    var responderCook2 = window.localStorage;
                    var addrCook2 = window.localStorage;
                    responderCook2.setItem("isResponder", "0");
                    addrCook2.setItem("addr", thisAddr + results.input1);
                   
                }
            }
        }
    }
    function pollForDisaster() {
        // feeds from other apps
    }
    function uploadToGPSsite() {
        // public site to recv gps coordinates of inhabited spaces
    }
    //function processEvent(event) {
    //    // process the event object
    //    function onSuccess(acceleration) {
    //        alert('Acceleration X: ' + acceleration.x + '\n' +
    //            'Acceleration Y: ' + acceleration.y + '\n' +
    //            'Acceleration Z: ' + acceleration.z + '\n' +
    //            'Timestamp: ' + acceleration.timestamp + '\n');
    //        if (isTrained) {
    //            //shake.stopWatch();
    //            navigator.accelerometer.clearWatch(watchID);
    //            //navigator.notification.alert('shake watch off, getting real time accel data (implies training==done)');
    //            for (var i = 0; i < 1050; i++) {
    //                totalAccel = Math.abs(acceleration.z);
    //                dataClass.push(totalAccel);
    //            }
    //            guessQuake(accelRealData);
    //        }   // check prediction! then start bluchatting if yes. not training when used here => rename function
    //        else { 

    //            navigator.notification.alert('shake watch continues, implies training==not done)');


    //        }
    //    }
    //    function onError() {
    //        alert('onError!');
    //    }
    //    var options = { frequency: 3000 };  // Update every 3 seconds
    //    watchID = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
    //}

    function showAllSessionVars() {
        var storage = window.localStorage;
        var storage2 = window.localStorage;
        var storage3 = window.localStorage;
        var _thisAddr = storage.getItem("addr");
        var _isResponder = storage2.getItem("isResponder");
        var _gps = storage3.getItem("gps");

        //navigator.notification.alert("addr: " + _thisAddr + " isResponder: " + _isResponder + " gps: " + _gps);
    }   

    //document.addEventListener("devicemotion", processEvent.bind(this), false);

    function onSuccess(acceleration) {
        totalAccel = Math.abs(acceleration.z);
        if (isTrained) {            
            accelRealData.push(totalAccel);
        }
        else {
            accelTrainingData.push(totalAccel); 
        }
    }
    function onError() {
        alert('onError!');
    }    
    function shakeDetectThread() {
        
        if (isTrained) {
            for (var i = 0; i < 1050; i++) {
                navigator.accelerometer.getCurrentAcceleration(onSuccess, onError);

            }
            guessQuake(accelRealData);
        }   // check prediction! then start bluchatting if yes. not training when used here => rename function
        else {
            //noop
        }
        //
        // want to shove n units of accel. data into trained NN - can it increment and re-check as it grows?
        //
        //var onShake = function () {
            
        //    if (isTrained) {
        //        shake.stopWatch();
        //        //navigator.notification.alert('shake watch off, getting real time accel data (implies training==done)');
        //        for (var i = 0; i < 1050; i++) {
        //            totalAccel = Math.abs(acceleration.z);
        //            dataClass.push(totalAccel);
        //        }
        //        guessQuake(accelRealData);
        //    }   // check prediction! then start bluchatting if yes. not training when used here => rename function
        //    else { // still training, 
        //        //shake.stopWatch();
        //        navigator.notification.alert('shake watch continues, implies training==not done)');
        //        //trainNNbp(accelTrainingData);
        //        //shake.startWatch();
        //    }
        //    //shake.startWatch();
        //    //timeZero = 0;
        //    //if (timeZero == 0) {
        //    //    timeZero = new Date().getTime() / 1000;
        //    //    //navigator.notification.alert(timeZero); // delta from o to f ~150 for 1.5min 
        //    //    timeFinal = new Date().getTime() / 1000;
        //    //}
        //    //timeFinal = timeFinal + 1;
        //    //if (timeFinal - timeZero > 10) { // ~ 10 sec of shaking
        //    //    shake.stopWatch();
        //    //    trainNNbp(); // check prediction! then start bluchatting if yes. not training when used here => rename function
        //    //    shake.startWatch();
        //    //    timeZero = 0;
        //    //}
        //    /* will never get here! */
        //    //navigator.notification.alert('after interval loop code');

        //};
        //var onError = function () {
        //    navigator.notification.alert("accelerometer err");
        //};
        //shake.startWatch(onShake, 1, onError);

    }

    class NN {        
        constructor() {
           
        }
        static buildNN() {
           
        }
    }

    function guessQuake() {
        const { Layer, Network } = window.synaptic;
        var inputLayer = new Layer(1);
        var hiddenLayer = new Layer(50);
        var outputLayer = new Layer(1);

        inputLayer.project(hiddenLayer);
        hiddenLayer.project(outputLayer);
        var myNetwork = new Network({
            input: inputLayer,
            hidden: [hiddenLayer],
            output: outputLayer
        });
        prediction = myNetwork.activate(accelRealData);
        navigator.notification.alert("prediction (0..1): " + prediction + accelRealData[1]);
    }  
    function getAccel(dataClass) {
        //var z = null;
        function onSuccess(acceleration) {
            totalAccel = acceleration.z;
            dataClass.push(totalAccel);
            //if (!isTrained) {
            //    dataClass.push(totalAccel);
            //}
            //if (isTrained) {
            //    accelRealData.push(totalAccel);
            //    //if (totalAccel > 625) { //ignore negative values // 25=5^2
            //    //    quakeCheckTriggered();
            //    //}
            //    //navigator.notification.alert('end shake check');
            //}
        }
        function onError() {
            navigator.notification.alert('Accel. Sensor Error!');
        }
        navigator.accelerometer.getCurrentAcceleration(onSuccess, onError);
    }
    function trainNNbp() {
        
        const { Layer, Network } = window.synaptic;
        var inputLayer = new Layer(2);
        var hiddenLayer = new Layer(3);
        var outputLayer = new Layer(1);
        
        inputLayer.project(hiddenLayer);
        hiddenLayer.project(outputLayer);
        var myNetwork = new Network({
            input: inputLayer,
            hidden: [hiddenLayer],
            output: outputLayer
        });

        if (!isTrained) {
            for (var i = 0; i < 1050; i++) {
                getAccel(accelTrainingData);
                document.getElementById("training").innerHTML += totalAccel + "<br>";
            }
            var learningRate = .8;
            myNetwork.activate(accelTrainingData);
            myNetwork.propagate(learningRate, [0]);
            navigator.notification.alert('done training!');
            isTrained = 1;
        }
        else {
            navigator.notification.alert('trained');
            prediction = myNetwork.activate(accelRealData);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
            navigator.notification.alert("prediction (0..1): " + prediction);
        }
    }

    function addrResponderMenu() {
        var storage = window.localStorage;
        var storage2 = window.localStorage;
        var _thisAddr = storage.getItem("addr");
        var _isResponder = storage2.getItem("isResponder");
        //navigator.notification.alert("addr: " + thisAddr + "    " + "isResponder? " + isResponder);
    }

    function getHorizFreq() {
        return hFreq;
    }  
    
    function fail(e) {
        console.log("FileSystem Error");
        console.dir(e);
    }    
    function gotFile(fileEntry) {

        fileEntry.file(function (file) {
            var reader = new FileReader();
            reader.onloadend = function (e) {
                navigator.notification.alert("Text is: " + this.result);
                //document.querySelector("#textArea").innerHTML = this.result;
            }
            reader.readAsText(file);
        });

    }
    function readFile(fileEntry) {

        fileEntry.file(function (file) {
            var reader = new FileReader();

            reader.onloadend = function () {
                navigator.notification.alert("Successful file read: " + this.result);
                displayFileData(fileEntry.fullPath + ": " + this.result);
            };

            reader.readAsText(file);

        }, onErrorReadFile);
    }       

    //function exit() {
    //    var exit = document.getElementById("exit");
    //    exit.innerHTML = "Background run mode is OFF";
    //    exit.style.color = "green";
    //    var wrapper = document.getElementById("deviceready");
    //    wrapper.appendChild(exit);
    //    cordova.plugins.backgroundMode.disable();
    //}

         
    function GPSinit() {  
        // onSuccess Callback
        // This method accepts a Position object, which contains the
        // current GPS coordinates
        var onSuccess = function (position) {
            thisAddr += "latitude:" + position.coords.latitude + ",longitude:" + position.coords.longitude + ",altitude:" + position.coords.altitude + ",";
            document.getElementById("out").innerHTML = thisAddr;
            //alert('Latitude: ' + position.coords.latitude + '\n' +
            //    'Longitude: ' + position.coords.longitude + '\n' +
            //    'Altitude: ' + position.coords.altitude + '\n' +
            //    'Accuracy: ' + position.coords.accuracy + '\n' +
            //    'Altitude Accuracy: ' + position.coords.altitudeAccuracy + '\n' +
            //    'Heading: ' + position.coords.heading + '\n' +
            //    'Speed: ' + position.coords.speed + '\n' +
            //    'Timestamp: ' + position.timestamp + '\n');
        };
        // onError Callback receives a PositionError object
        function onError(error) {
            alert('code: ' + error.code + '\n' +
                'message: ' + error.message + '\n');
        }
        navigator.geolocation.getCurrentPosition(onSuccess, onError);
    }

    //function onPause() {
    //    // TODO: This application has been suspended. Save application state here.
    //};
    function connectSocket() {
        networking.bluetooth.connect(device.address, BASE_UUID, function (socketId) {
            // Profile implementation here.
        }, function (errorMessage) {
            navigator.notification.alert('Connection failed: ' + errorMessage);
        });
    }

    //function onResume() {
    //    // TODO: This application has been reactivated. Restore application state here.
    //};

    function decideBeacon(numNeighs) { // eg set this blutooth name based upon pnp/neighbor router
        // *** commented out random selection ***
        var selected = 0;
        selected = getRandomInt(0, numNeighs);
        return selected;
        // *** end random selection

    }
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }    
    function getOtherTeeth() {
        // *** device_names[device.address] == 'undefined' when slot is empty
        var updateDeviceName = function (device) {
            //if (device.name.includes("+")) {
            //var storage = window.localStorage;
            //broadCastHist[device.name] += device.name; 
            device_names[device.address] = device.name;
                //switchToAddr = device.address;
            //}
            //navigator.notification.alert('msg: ' + device_names[device.address]);

        };

        // Add listener to receive newly found devices 
        networking.bluetooth.onDeviceAdded.addListener(updateDeviceName);

        // With the listener in place, get the list of known devices 
        networking.bluetooth.getDevices(function (devices) {
            for (var i = 0; i < devices.length; i++) {
                updateDeviceName(devices[i]);
            }
        });

        // Now begin the discovery process. 
        networking.bluetooth.startDiscovery(function () {
            // Stop discovery after 30 seconds. 
            setTimeout(function () {
                networking.bluetooth.stopDiscovery();
            }, 300000);
        });
        
    }
    function countProperties(obj) {
        var count = 0;

        for (var prop in obj) {
            if (obj.hasOwnProperty(prop))
                ++count;
        }

        return count;
    }
    
    function setThisBeaconMsg() {
        var storage = window.localStorage;
        var thisGPS = storage.getItem("gps");
        networking.bluetooth.getAdapterState(function (adapterInfo) {
            bluetoothSerial.setName(thisAddr + " gps: " + thisGPS);
        }, function (errorMessage) {
            //navigator.notification.alert(errorMessage);
        });
    }
    function turnBluOn() {
        networking.bluetooth.getAdapterState(function (adapterInfo) {
            // The adapterInfo object has the following properties:
            // address: String --> The address of the adapter, in the format 'XX:XX:XX:XX:XX:XX'.
            // name: String --> The human-readable name of the adapter.
            // enabled: Boolean --> Indicates whether or not the adapter is enabled.
            // discovering: Boolean --> Indicates whether or not the adapter is currently discovering.
            // discoverable: Boolean --> Indicates whether or not the adapter is currently discoverable.
            // adapterInfo.name = "adaptor name set - permissions granted"; // careful with local cache of names, could get stale
        }, function (errorMessage) {
            //navigator.notification.alert(errorMessage);
        });

        var enabled = false;
        networking.bluetooth.getAdapterState(function (adapterInfo) {
            enabled = adapterInfo.enabled;
        });

        networking.bluetooth.onAdapterStateChanged.addListener(function (adapterInfo) {
            // The adapterInfo object has the same properties as getAdapterState
            if (adapterInfo.enabled !== enabled) {
                enabled = adapterInfo.enabled;
                if (enabled) {
                    //navigator.notification.alert('this tooth listener has been added');
                } else {
                    navigator.notification.alert('this tooth listener failed bc enabled is false');
                }
            }
        });

        networking.bluetooth.requestEnable(function () {
            // The adapter is now enabled
          
            
        }, function () {
            // The user has cancelled the operation
        });

        var onSuccess = function (result) {
           
        };
        var onError = function (result) {
            navigator.notification.alert(result);
          
        };
    }    
    function getMyBluDevices() {
        networking.bluetooth.getDevices(function (devices) {
            for (var i = 0; i < devices.length; i++) {
                // The deviceInfo object has the following properties:
                // address: String --> The address of the device, in the format 'XX:XX:XX:XX:XX:XX'.
                // name: String --> The human-readable name of the device.
                // paired: Boolean --> Indicates whether or not the device is paired with the system.
                // uuids: Array of String --> UUIDs of protocols, profiles and services advertised by the device.
                if (j == i) {
                    //navigator.notification.alert(devices[i].address + "," + devices[i].name);
                }
            }
        });
    }
    function makeThisPublic() { // eg discoverable blutooth on this device
        networking.bluetooth.requestDiscoverable(function () {
            // The device is now discoverable
        }, function () {
            // The user has cancelled the operation
            });
    }      
    function occurrences(string, subString, allowOverlapping) {

        string += "";
        subString += "";
        if (subString.length <= 0) return (string.length + 1);

        var n = 0,
            pos = 0,
            step = allowOverlapping ? 1 : subString.length;

        while (true) {
            pos = string.indexOf(subString, pos);
            if (pos >= 0) {
                ++n;
                pos += step;
            } else break;
        }
        return n;
    }
})();
