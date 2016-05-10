var _ifmatch;

// Add context menu for Fiori elements, send data to main.js
/*
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  chrome.tabs.getSelected(null, function(tab){
    chrome.browserAction.onClicked =  chrome.tabs.sendMessage(  tab.id, {method: "showData", info:info, tab:tab});
  });
});

chrome.contextMenus.create({
  id: 'findOdataBinding',
  title: 'get OData binding',
  contexts: ['all']
});*/
// --------------------------------------------------

var _tab;
var _services;
var _metadata;
var _url;

chrome.runtime.onMessage.addListener(
  function(request, sender) {
    chrome.storage.sync.get({enabled:true}, function(options) {
      if(options.enabled === false)     chrome.browserAction.setIcon({path:"res/icon_disabled.png"});
      else if(request.active === true)  chrome.browserAction.setIcon({path:"res/icon.png"});
      else                              chrome.browserAction.setIcon({path:"res/icon_gray.png"});
    });
  }
);

// On tab change => check if metadata available => change icon
chrome.tabs.onActivated.addListener(function (activeInfo){
  
  chrome.tabs.getSelected(null, function(tab){
    _url = tab.url;
  });
  
  chrome.storage.sync.get({enabled:true}, function(options) {
    if(!options.enabled){
      chrome.browserAction.setIcon({path:"res/icon_disabled.png"});
    }else{
      chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        chrome.tabs.sendMessage(  tabs[0].id, {method: "getMetadata"},function(response){ 
            chrome.browserAction.setIcon({path: (response && response.metadata)? "res/icon.png":"res/icon_gray.png" }); }
        );
      });
    }
  });
});

chrome.storage.sync.get({ifmatch:false}, function(options) {
	_ifmatch = options.ifmatch;
});
  
chrome.storage.sync.get({enabled:true}, function(options) {
  if(options.enabled){
    // On popup open => load metadata & services from background
    chrome.tabs.getSelected(null, function(tab){
      _url = tab.url;
      chrome.browserAction.onClicked =  chrome.tabs.sendMessage(  tab.id, {method: "getServices"},function(response){
          if(response){ _services = response.services; }
        });
        
      chrome.browserAction.onClicked =  chrome.tabs.sendMessage( tab.id, {method: "getMetadata"}, function(response){
          if(response){
          	loadPopup(response.metadata,response.initRoot,response.root);
          }
        });
    });
  }else{
    $("#content").hide();
    $("#disabledMsg").show();
  }
});

function loadPopup(metadata,initRootURL,rootURL){
  var i;
  
 if(metadata){
    var root;
    if(_services && Object.keys(_services).length > 0){
      root       = _services[initRootURL].split("/$")[0];
    }else{
      root = rootURL;
    }
    
    var schema     = metadata.Edmx.DataServices.Schema;
    
    entityTypes    = schema.EntityType      || schema[0].EntityType;
    entitySets     = schema.EntityContainer || schema[1].EntityContainer;
    entitySets     = entitySets.EntitySet;
    
  	odata_version  = metadata.Edmx.DataServices["_m:MaxDataServiceVersion"] || // 3.0
                     metadata.Edmx.DataServices["_m:DataServiceVersion"] ||   // 2.0
  	                 metadata.Edmx["_Version"];         
	
	// Only a single entity type has been found => wrap with an array to continue as usual
    if(!Array.isArray(entityTypes)){	entityTypes = [entityTypes]; }
    if(!Array.isArray(entitySets)){		entitySets	= [entitySets]; }
      
	  var find                = partial(findItems,entitySets,root,odata_version);
    findButton.onclick      = find;
	  var send                = partial(sendBatch,root);
    sendBatchButton.onclick = send;
    batchReq.onkeypress     = adjustBatchReq;
    //valueInput.onkeydown  = find;
     
    var metaSelectType  = document.getElementById('typeSelect');
    metaSelectType.innerHTML = '';
    
    var entityTypeNames = [];
    
    for(i=0; i<entityTypes.length; i++){
      entityTypeNames.push(entityTypes[i]['_Name']);
    }
    
    entityTypeNames.sort();
    
    for(i=0; i<entityTypeNames.length; i++){
      var entityType = document.createElement('option');
      entityType.text  = entityTypeNames[i];
      entityType.value = entityTypeNames[i];
      metaSelectType.appendChild(entityType);
    }
    
	  var setProps = partial(setProperties,entityTypes);
    metaSelectType.onchange = setProps;
    metaSelectType.onkeypress = function(event){
      if(event.keyCode == 10){ // Ctrl + Enter => Just enter causes Chrome to crash (Open Dropdown & Navigate = Issue?)
    	  findItems(entitySets,root,odata_version);
      }
    };
    
    setProperties(entityTypes);
    
    /*var metaSearchInput = document.getElementById('valueInput');
    metaSearchInput.value = '';*/

    typeSelect.focus();
    fuzzySearch.onchange = wrapValue;
    
    if(_services && Object.keys(_services).length > 0){
      if(!serviceSelect.innerHTML){
        var selVal;
        
        var serviceKeys = Object.keys(_services);
        serviceKeys.sort();
        
        for(i=0; i<serviceKeys.length; i++){
          var service    = serviceKeys[i];
          var serviceOpt = document.createElement('option');
          serviceOpt.text  = service;
          serviceOpt.value = _services[service];
          serviceSelect.appendChild(serviceOpt);
          
          if(service == initRootURL){ selVal = _services[service]; }
        }
        
        serviceSelect.value = selVal;
        
        serviceSelect.onchange = function(){
          var selServ = serviceSelect.options[serviceSelect.selectedIndex];
          loadMetadata(selServ.value,selServ.innerHTML);
        };
      }
    }
  }else{
    searchContent.style.display = "none";
    notfound.style.display      = "";
  }
  
  $(".addHeaderButton").click(addHeaderHandler);
  $(".removeHeaderButton").click(removeHeaderHandler);
  $("#sendAsBatchReq").click( function(){
    if($("#sendAsBatchReq").is(":checked")){
     $("#contentTypeSelect option[value='multipart/mixed; boundary=']").attr('selected',true);

     var currentBatchContent = $('#batchReq').val();
     try{
     	$('#batchReq').val(
			'--batch_6f4f-7bb3-3789\n'+
			'Content-Type: multipart/mixed; boundary=changeset_74e6-2e1b-51c3\n\n'+

			//'--changeset_74e6-2e1b-51c3\n'+
			//'Content-Type: application/http\n'+
			//'Content-Transfer-Encoding: binary\n\n'+

			'POST test HTTP/1.1\n'+
			'Accept: application/json\n'+
			'Content-Type: application/json\n'+
			'Accept-Language: en-US\n'+
			'DataServiceVersion: 2.0\n'+
			'MaxDataServiceVersion: 2.0\n'+
			'Content-Length: '+currentBatchContent.length+'\n'+
			'x-csrf-token: uOGlmnfalN8MPy78IGuPsg==\n\n'+

			currentBatchContent+'\n\n'+

			//'--changeset_74e6-2e1b-51c3--\n'+
			'--batch_6f4f-7bb3-3789--'
		);

     }catch(e){alert('nope, no json')}

    }else{
     $("#contentTypeSelect option[value='application/json']").attr('selected',true);
    }
  });
  
  batchImage.onchange = function(){
    var reader = new FileReader();
    reader.onload = function (e){
      fileImage.src = e.target.result;
    };

    reader.readAsDataURL(batchImage.files[0]);
  };
}

function addHeaderHandler(){
  var row       = this.parentNode.parentNode;
  var rowIndex  = row.rowIndex;
  
  if($(row).find(".headerName").is(":hidden")){
    $(row).find(".headerName").show();
    $(row).find(".headerValue").show();
    return;
  }
  
  var newRow    = row.cloneNode(true);
  $(newRow).find(".addHeaderButton")[0].onclick     = addHeaderHandler;
  $(newRow).find(".removeHeaderButton")[0].onclick  = removeHeaderHandler;
  
  var headerValueField = $(row).find(".headerValue")[0];
  if(headerValueField.nodeName == "SELECT"){
    
    var newInput = document.createElement("input");
    newInput.className = "headerValue";
    newInput.style.width="100px";
    newInput.value=headerValueField.value;
    
    $(headerValueField).replaceWith(newInput);
  }
  
  headerTabBody.insertBefore(newRow,row);
}

function removeHeaderHandler(){
  var row = this.parentNode.parentNode;
  
  if(row.parentNode.rows.length == 2){
    $(row).find(".headerName").hide();
    $(row).find(".headerValue").hide();
    return;
  }
  headerTabBody.removeChild(row);
}

function loadDoc(filename){
  xhttp = (window.XMLHttpRequest)? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
  xhttp.open("GET",filename,false);
  xhttp.send();
  return xhttp;
}

function setProperties(entityTypes){
  if(!typeSelect.options || typeSelect.options.length === 0){ alert('No types found!'); return; }
  
  var type = typeSelect.options[typeSelect.selectedIndex].value;
  var propNames     = [];
  var keyPropNames  = [];
  var i,j;
  
  for(i=0; i<entityTypes.length; i++){
    if(entityTypes[i]["_Name"] == type){
      var keyProps    = entityTypes[i].Key.PropertyRef;
      
      for(j=0; j<keyProps.length; j++){
        keyPropNames.push(keyProps[j]["_Name"]);
      }
      
      var entityProps = entityTypes[i].Property;
      for(j=0; j<entityProps.length; j++){
        propNames.push(entityProps[j]["_Name"]);
      }
      
      break;
    }
  }
  
  for(i=0; i<keyPropNames.length; i++) {
    var index = propNames.indexOf(keyPropNames[i]);
    propNames.splice(index,1);
  }

  keyPropNames.sort();
  propNames.sort();
  
  var prop;
  
  propSelect.innerHTML = "";
  
  for(i=0; i<keyPropNames.length; i++){
        prop = document.createElement('option');
        prop.text  = keyPropNames[i];
        prop.value = keyPropNames[i];
        prop.style["color"] = "blue";
        prop.style["background-color"] = "lightblue";
        propSelect.appendChild(prop);
  }
  
  for(i=0; i<propNames.length; i++){
        prop = document.createElement('option');
        prop.text  = propNames[i];
        prop.value = propNames[i];
        propSelect.appendChild(prop);
  }
}

function buildEntityURL(url){
  
  var collection;
  
  var type  = typeSelect.options[typeSelect.selectedIndex].value;
  
  for(var i=0; i<entitySets.length; i++){
    var tmp = entitySets[i]["_EntityType"].split('.');
    if(tmp[tmp.length-1] == type){
      collection = entitySets[i]["_Name"];
      break;
    }
  }
  
  if(collection){
    url = url+'/'+collection;
  }
  
  return url;
}

function findItems(entitySets,url,odata_version){//event){

  /*if(event.keyCode && event.keyCode != 13){
    return;
  }*/
  /*
  var collection;
  
  var type  = typeSelect.options[typeSelect.selectedIndex].value;
  var prop  = propSelect.options[propSelect.selectedIndex].value;
  var fuzzy = fuzzySearch.checked;
  
  for(var i=0; i<entitySets.length; i++){
    var tmp = entitySets[i]["_EntityType"].split('.');
    if(tmp[tmp.length-1] == type){
      collection = entitySets[i]["_Name"];
      break;
    }
  }
  
  if(collection){
    url = url+'/'+collection+'?$format=json';
  */
  
  var prop  = propSelect.options[propSelect.selectedIndex].value;
  
  url = buildEntityURL(url) + '?$format=json';
  
  if(valueInput.value !== ''){
    url += '&$filter=';
    
    if(fuzzySearch.checked) url += 'substringof(\''+ valueInput.value +'\','+prop+')';
    else                    url += prop + ' eq ' + valueInput.value;
  }
  
  url += '&'+((odata_version < 4.0)? '$inlinecount=allpages' : '$count=true') + '&$top=5';
  
  window.open(url, '_blank');
  win.focus();

}

function wrapValue(){
  if(!valueInput.value) return;
  
  // Fuzzy => don't wrap
  if(fuzzySearch.checked){ return; }
  
  // No need to wrap a numeric value
  if(!isNaN(parseFloat(valueInput.value)) && isFinite(valueInput.value)) return;
  
  // Value is already wrapped (maybe even with guid) => done.
  if(valueInput.value.match(/(guid)?'[^']*'/)) return;
  
  valueInput.value = "'"+valueInput.value+"'";
}

function partial(func /*, 0..n args */) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var allArguments = args.concat(Array.prototype.slice.call(arguments));
    return func.apply(this, allArguments);
  };
}

function sendBatch(url){
  
  var formData,content,contentType;
  var asBatch = $("#sendAsBatchReq")[0].checked;
  
  if(asBatch){
    if(batchImage.files.length > 0){
      formData = new FormData();
      formData.append('userFile',batchImage.files[0],batchImage.files[0].name);
    }else{
      try{
      	content         = batchReq.value;
      	batchBoundary	= 'boundary='+content.split("\n")[0].replace(/--/g,'');
        contentType 	= content.split("Content-Type:")[1].split("\n")[0].trim();
      	contentType   	= contentType.replace(/boundary=.*/,batchBoundary);

      	var boundaryOption = $("#contentTypeSelect option[value='multipart/mixed; boundary=']");
      	boundaryOption.val('multipart/mixed; '+batchBoundary).html('multipart/mixed; '+batchBoundary);
      }catch(e){
        alert('Invalid Batch-Content!');
        console.log(e);
        return;
      }
    }
    
    send(url, content, formData, contentType, asBatch);

  }else{
    content     = batchReq.value;
	contentObj	= JSON.parse(content);
	
	// Check if an array has been handed => post single entities
	if(contentObj.constructor === Array){
		for(var i=0; i<contentObj.length; i++){
			send(url, JSON.stringify(contentObj[i]), formData, contentType, asBatch, i);  
		}
	}else{
		send(url, content, formData, contentType, asBatch);  
	}
  }
}

function send(url, content, formData, contentType, asBatch, listIndex){

	var csrf_token, if_match, xmlhttpGET, xmlhttpPOST;
	
	if (window.XMLHttpRequest)
	{// code for IE7+, Firefox, Chrome, Opera, Safari
		xmlhttpGET=new XMLHttpRequest();
		xmlhttpPOST=new XMLHttpRequest();
	}
	else
	{// code for IE6, IE5
		xmlhttpGET=new ActiveXObject("Microsoft.XMLHTTP");
		xmlhttpPOST=new ActiveXObject("Microsoft.XMLHTTP");
	}
	
	xmlhttpGET.onreadystatechange=function()
	{
		if (xmlhttpGET.readyState==4 && xmlhttpGET.status==200){
			csrf_token = xmlhttpGET.getResponseHeader('X-CSRF-Token');
			if(_ifmatch) if_match   = xmlhttpGET.getResponseHeader('ETag');
		  
			var selectedMethod  = document.getElementById('requestType');
			var httpMethod      = selectedMethod.options[selectedMethod.selectedIndex].value;

			var requestURL      = ((asBatch /*content*/)? (url+'/$batch') : buildEntityURL(url));

			// If it's not a batch request and not a POST => use the search field value as ID
			// If there's no value set => just use the current object shown on the main tab
			if(!asBatch && httpMethod != 'POST'){
				var itemID = document.getElementById('valueInput').value;

				if(itemID !== ''){ requestURL += '('+document.getElementById('valueInput').value+')'; }
				else{ requestURL = _url.split("?")[0]; }
			}
		  
			xmlhttpPOST.open(((asBatch)? 'POST' : httpMethod),requestURL,true);
			xmlhttpPOST.setRequestHeader('X-CSRF-Token', csrf_token); 
			
			if(_ifmatch && if_match) xmlhttpPOST.setRequestHeader ('If-Match', if_match); 
  		
			// Add headers from UI

			var headers = $("#headerTabBody").children();

			headers.each(function(index){
			  var headerName  = $(headers[index]).find(".headerName")[0];
			  var headerValue = $(headers[index]).find(".headerValue")[0];
			  //console.log("Header "+index+" - "+headerName+": "+headerValue);
			  if(headerName && headerValue){
				xmlhttpPOST.setRequestHeader(headerName.value,headerValue.value); 
			  }
			});
			/*for(var i=1;i<headerTab.rows.length;i++){
			  if(headerTab.rows[i].cells[0].firstChild.value) xmlhttpPOST.setRequestHeader(headerTab.rows[i].cells[0].firstChild.value,headerTab.rows[i].cells[1].firstChild.value); 
			}*/
  		
			if(content){
				content = content.replace(/x-csrf-token:.*/g,"x-csrf-token: "+csrf_token);
				
				//xmlhttpPOST.setRequestHeader("Content-Type",contentType);
				xmlhttpPOST.send(content); 

			}else if(formData){
				//xmlhttpPOST.setRequestHeader("Content-Type", "image/jpeg");
				//xmlhttpPOST.setRequestHeader("X-File-Size", batchImage.files[0].size);
				xmlhttpPOST.send(formData);
			}
		}
	};
	
	xmlhttpPOST.onreadystatechange=function()
	{
		if (xmlhttpPOST.readyState==4 && 200 <= xmlhttpPOST.status && xmlhttpPOST.status < 300){
		  
		  console.log("============================================================");
		  console.log("===                   REQUEST RESPONSE                   ===");
		  console.log("============================================================");
			console.log(xmlhttpPOST.responseText);
			
		  if(checkBatchErrors(xmlhttpPOST.responseText)){
		    return;
		  }
		  
			if(confirm('Update Successful. Reload?')){
        chrome.tabs.sendMessage(_tab.id, {method: "reload"});
			}
		}else if(xmlhttpPOST.readyState==4 && xmlhttpPOST.status!=200 && xmlhttpPOST.responseText){
			
		  console.log("============================================================");
		  console.log("===                   REQUEST RESPONSE                   ===");
		  console.log("============================================================");
			console.log(xmlhttpPOST.responseText);
			
			var errorMsg = xmlhttpPOST.responseText.split(/message[^>]*>/)[1];
			if(errorMsg){ 	errorMsg = errorMsg.split('<')[0]; }
			else{			errorMsg = xmlhttpPOST.responseText; }
			
			if(listIndex){
				console.log('%c#'+listIndex+': '+errorMsg, 'background: #000; color: #FF0000');
			}else{
				alert(errorMsg);
			}
		}
	};
	
	//xmlhttpGET.open("GET",url+'/$metadata',true);
	
	xmlhttpGET.open("GET",_url.split('?')[0],true);
	xmlhttpGET.setRequestHeader ('X-CSRF-Token', 'Fetch');
	xmlhttpGET.send();
}

function adjustBatchReq(){
  
  // Adjust size
  var lines = batchReq.value.split('\n');
  var lineSize = 0;
  var i;
  
  for(i=0; i<lines.length; i++){
    lineSize = Math.max(lineSize,lines[i].length);
  }
  
  document.body.style["min-width"]  = Math.max(800,25+lineSize)+"px";
  document.body.style["max-width"]  = Math.max(800,25+lineSize)+"px";
  batchContent.style.width          = Math.max(750,25+lineSize)+"px";
  batchReq.style.width              = Math.max(750,25+lineSize)+"px";
  
  batchReq.style.height             = Math.max(800,25+batchReq.scrollHeight)+"px";
  
  
  // Adjust Content-Type Header
  var headers = $("#headerTabBody").children();
  
  // Check all headers
  for(i=1; i<headers.length; i++){ // Skip table header
    var headerName  = $(headers[i]).find(".headerName")[0].value;
    var headerValue = $(headers[i]).find(".headerValue")[0].value;
    
    // Adjust Content-Type boundary to bach request id if available
    if(headerName.toLowerCase() == "content-type" && headerValue.indexOf("multipart/mixed; boundary=") === 0){
      var batchReqID = $("#batchReq")[0].value.split("\n")[0].slice(2);
      
      if(batchReqID.indexOf("batch") !== 0){ break; }
      
      var headerValueField = $(headers[i]).find(".headerValue")[0];
      if(headerValueField.nodeName == "SELECT"){
        var newInput = document.createElement("input");
        newInput.className = "headerValue";
        newInput.style.width="100px";
        $(headerValueField).replaceWith(newInput);
        headerValueField = newInput;
      }
      
      headerValueField.value = "multipart/mixed; boundary=" + batchReqID;
    }
  }
}

function checkBatchErrors(responseText){
  var msg;
  
	if(responseText.indexOf('{"error"') != -1 || responseText.indexOf('400 Bad Request') != -1){
		msg           = responseText.split('"value":')[1];
		if(msg){  msg  = msg.split('}')[0]; }
		else{
			msg = '';	
			var messages = responseText.match(/<message[^>]*>[^<]*/g);
			
			for(var i=0; i<messages.length; i++){
				msg   += messages[i].split('>')[1]+'\n';
			}		
		}

		alert(msg);
		
		return true;
	}
	
	return false;
}

function loadMetadata(metaURL,initRootURL){
	var xmlhttpGET  = (window.XMLHttpRequest)? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	
	xmlhttpGET.onreadystatechange = function()
	{
		if (xmlhttpGET.readyState==4 && xmlhttpGET.status==200){
			 var x2js	= new X2JS();
			_metadata   = x2js.xml_str2json( xmlhttpGET.responseText );
			
			loadPopup(_metadata,initRootURL);
		}
	};
	
	xmlhttpGET.open("GET",metaURL,true);
	xmlhttpGET.send();
}