function create(){
  send('POST',JSON.stringify(getRequestBody()));
}


function update(){
  chrome.storage.sync.get({updateMethod:'PUT'}, function(options) {
	  send((options.updateMethod),JSON.stringify(getRequestBody()));
  });
  
  console.log("============================================================");
  console.log("===                   REQUEST BODY                       ===");
  console.log("============================================================");
  console.log(JSON.stringify(getRequestBody()));
}


function del(){
	
	var items 	= $('.listItem');
	var colName	= getCollectionName(_entityName);
	var urls		= [];
	
	if(!_isSingleEntity && !batchMode.checked){
		alert('Delete for multiple entries only possible in Batch Mode!');
		return;
	}
	
	// Loop over list items
	for(var i=0; i<items.length; i++){
		if($(items[i]).find(':checkbox')[0].checked){
			
			// Loop over properties
			var href = $(items[i]).find('.keyTab').find('.idFieldLink')[0].href;
			urls.push(href.split('?')[0]);
		}
	}
	
	if(!_isSingleEntity && urls.length === 0){
		alert('Please select items for deletion first!');
		return;
	}
	
	send('DEL',null,urls);
}


function send(reqType,content,urls){
	
	var contentType 	= "application/json; charset=ISO-8859-1";
	var reqContent     = "";
	
	if(batchMode.checked){
		var batchId     	= '36522ad7-fc75-4b56-8c71-56071383e77b';
		var changesetId 	= '77162fcd-b8da-41ac-a9f8-9357efbbd621';
		
		if(urls && urls.length > 0){
			for(var i=0; i<urls.length;i++){
				reqContent		+= createBatch(null,changesetId,reqType,urls[i],content);
			}
		
			reqContent =		'--batch_'+batchId+'\n'+
							'Content-Type: multipart/mixed; boundary=changeset_'+changesetId+'\n\n'+
							reqContent+
							'--changeset_'+changesetId+'--\n\n'+
							'--batch_'+batchId+'--';
		}else{
			reqContent = createBatch(batchId,changesetId,reqType,null,content);
		}
		
		contentType 		= "multipart/mixed; boundary=batch_"+batchId+'; charset=ISO-8859-1';        
	}else{
		reqContent 		= content;
	}
	
	var xmlhttpGET;
	var xmlhttpPOST;
	var csrf_token;
	var if_match;
	
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
			if_match   = xmlhttpGET.getResponseHeader('ETag');
		   
			if(batchMode.checked){
				xmlhttpPOST.open('POST',_root+'/$batch',true);
				reqContent = reqContent.replace('[csrf]',csrf_token);
				reqContent = reqContent.replace('[ifmatch]',if_match);
			}else{
				xmlhttpPOST.open(reqType,_path,true);
				// Only for non-batch-requests, exception otherwise
			  xmlhttpPOST.setRequestHeader('If-Match', if_match);
			}
		  
			xmlhttpPOST.setRequestHeader ('X-CSRF-Token', csrf_token);
			xmlhttpPOST.setRequestHeader("Content-type",contentType);    
			xmlhttpPOST.send(reqContent);
		}
	};
	
	xmlhttpPOST.onreadystatechange=function()
	{
		if (xmlhttpPOST.readyState==4 && 200 <= xmlhttpPOST.status && xmlhttpPOST.status < 300){
		  console.log("============================================================");
		  console.log("===                   REQUEST RESPONSE                   ===");
		  console.log("============================================================");
			console.log(xmlhttpPOST.responseText);
			
			
		  if(batchMode.checked){
		    var errorsFound = checkBatchErrors(xmlhttpPOST.responseText);
		    if(errorsFound) return;
		  }
		  
		  // Validate if a new object was found
			if(!batchMode.checked && reqType == 'POST'){
  			var newURL = $(xmlhttpPOST.responseText).find('id').html();
  			
  			if(newURL){
  			  var tryCnt      = 1;
    		  var xmlhttpCheck=new XMLHttpRequest();
    		  xmlhttpCheck.onreadystatechange=function(){
    		    if (xmlhttpCheck.readyState==4 && 200 <= xmlhttpCheck.status && xmlhttpCheck.status < 300){
        		  console.log("\n\n============================================================");
        		  console.log("===                 FOUND ITEM - RESPONSE:               ===");
        		  console.log("============================================================");
        			console.log(xmlhttpCheck.responseText);
        			
        			chrome.storage.sync.get({askForReload:true}, function(options) {
            	  if(options.askForReload){
            			switch(reqType){
            				case 'PUT':
            				case 'PATCH':
            				case 'MERGE':
            					if(confirm('Update Successful. Reload?')){
            						location.reload(); 
            					}
            					break;
            				case 'POST':
            					if(confirm('Entity Creation Successful. Reload?')){
            						location.reload(); 
            					}
            					break;						
            				case 'DEL':
            					alert('Deletion Successful');
            					break;
            			}
            	  }
              });
              
  		      }else if(xmlhttpCheck.readyState==4 && xmlhttpCheck.status!=200 && xmlhttpCheck.responseText){
        			var errorMsg = xmlhttpCheck.responseText.split(/message[^>]*>/)[1];
        			if(errorMsg){ 	errorMsg = errorMsg.split('<')[0]; }
        			else{			      errorMsg = xmlhttpCheck.responseText; }
        			
            	if(confirm( ( (tryCnt > 1)? 'Still not working (#'+tryCnt+') -\n':'' )+
            	            ((xmlhttpCheck.status==404)? 'The created object could not be found.\n':'')+
            	            'The following error occurred while fetching the new object:'+
            	            '\n---------------------------------------------------------\n'+
            	            errorMsg+
            	            '\n-------------------------------------------------------\nRetry?')){
              	xmlhttpCheck.open("GET",newURL+'?§try='+(tryCnt++),true);
              	xmlhttpCheck.send();
            	}
        			//alert(errorMsg);
  		      }
    		  };
    		  
        	xmlhttpCheck.open("GET",newURL,true);
        	xmlhttpCheck.send();
  			}
			}else{
  		  chrome.storage.sync.get({askForReload:true}, function(options) {
      	  if(options.askForReload){
      			switch(reqType){
      				case 'PUT':
      				case 'PATCH':
      				case 'MERGE':
      					if(confirm('Update Successful. Reload?')){
      						location.reload(); 
      					}
      					break;
      				case 'POST':
      					if(confirm('Entity Creation Successful. Reload?')){
      						location.reload(); 
      					}
      					break;						
      				case 'DEL':
      					alert('Deletion Successful');
      					break;
      			}
      	  }
        });
			}
			
			propsUpdated = false;
		}else if(xmlhttpPOST.readyState==4 && xmlhttpPOST.status!=200 && xmlhttpPOST.responseText){
			
		  console.log("============================================================");
		  console.log("===                   REQUEST RESPONSE                   ===");
		  console.log("============================================================");
			console.log(xmlhttpPOST.responseText);
			
			//var errorMsg = xmlhttpPOST.responseText.split(/message[^>]*>/)[1];
			//if(errorMsg){ 	errorMsg = errorMsg.split('<')[0]; }
			//else{			errorMsg = xmlhttpPOST.responseText; }
			
			var errorMsg = $(xmlhttpPOST.responseText).find('message').html();
			alert(errorMsg || xmlhttpPOST.responseText);
		}
	};
	
	xmlhttpGET.open("GET",window.location.href.split('?')[0],true);
	xmlhttpGET.setRequestHeader ('X-CSRF-Token', 'Fetch');
	xmlhttpGET.send();
	
}

function createBatch(batchId,changesetId,reqType,url,content){
	
	var entityPath 		  = (url)? url.substring(url.lastIndexOf('/')+1,url.length) : _path.substring(_path.lastIndexOf('/')+1,_path.length);
	var collectionPath  = entityPath.split('(')[0];
	var batch 			    = '';
	
	if(batchId){
		batch +=
		'--batch_'+batchId+'\n'+
		'Content-Type: multipart/mixed; boundary=changeset_'+changesetId+'\n\n';
	}
	
	batch +=
		'--changeset_'+changesetId+'\n'+
		'Content-Type: application/http\n'+
		'Content-Transfer-Encoding: binary\n\n';
				
	var tmp = 
		'Accept: application/json\n'+
		'Accept-Language: en-US\n'+
		'DataServiceVersion: 1.0\n'+
		'MaxDataServiceVersion: '+_odata_version+'\n'+
		'x-csrf-token: [csrf]\n'+
		'If-Match: [ifmatch]\n';
	
	switch(reqType){
		case 'POST':
			batch +=
				"POST "+collectionPath+" HTTP/1.1\n"+
				tmp+                   
				'Content-Type: application/json\n'+
				'Content-Length: '+(content.length+1)+'\n\n'+
				content+'\n\n';
			break;
		case 'DEL':
			batch +=
				"DELETE "+entityPath+" HTTP/1.1\n"+
				tmp+'\n\n';
			break;
		case 'PUT':
		case 'PATCH':
		case 'MERGE':
			batch +=
			  reqType+' '+entityPath+" HTTP/1.1\n"+	// MERGE won't work for e.g. Northwind OData
				tmp+                    
				'Content-Type: application/json\n'+
				'Content-Id: 1\n'+
				'Content-Length: '+(content.length+1)+'\n\n'+
				content+'\n\n';
			break;
	}
	
	var result = batch;
	
	if(batchId){
		result += '--changeset_'+changesetId+'--\n\n';			
		result += '--batch_'+batchId+'--';
	}    
	
	return result;
}

function getRequestBody(){
  var reqBody = {};
  
  var propTypes = getPropertyTypes(_entityName);
  
  $('#mainTab').find('.keyTab,.propTab').each(function(){
    $(this.rows).each(function(){
      var prop  = $(this).find('.propertyLabel')[0].innerHTML;
      var value = $(this).find('.idFieldInput')[0] || $(this).find('.propertyInput')[0];
      
      value     = value.value;
      
      if(!propTypes[prop]){ return; }
      
      if(propTypes[prop].indexOf('Edm.Int') === 0){
        value = parseInt(value);
      }
      if(propTypes[prop].indexOf('Edm.Boolean') === 0){
        value = Boolean(value);
      }
     	if(prop && value && value != 'object'){
		  	reqBody[prop] = value;
		  }
    });
  });
  
  $.extend( true, reqBody, getChildren('#mainTab') );
  
  return reqBody;
}

// ===================================================================
// Deep Create Data
// ===================================================================
// Returns an object containing all succeeding child properties
function getChildren(tab){
   
   var props = {};
    
   $(tab).parents('.superTab:first').find('.navTab:first > tbody:first').children().each(function(){
      var propName = $(this).find('.propertyLabel:first').html();
      var content  = $(this).find('.superTab:first');

      if(content.length === 0){ return; }
      
      var childPropTab = content.find('table:first');
      
      // Collection
      if(childPropTab.children('tbody').children('tr').children('td').children('div').attr('class') == 'propWrapper'){
        props[propName] = []; childPropTab.find('.collectionTab:first').children('tbody').children('tr').each(function(){
            if($(this).find('.useForCreate:first').is(':checked')){
                props[propName].push(getProps( $(this) ) );
            }
        });
      }
      // Properties
      else{ if($(this).find('.useForCreate:first').is(':checked')){ props[propName] = getProps(childPropTab); } }
  });

  return props;
}

function getProps(childTab){
  
  if(!childTab.find('.useForCreate:first').is(':checked')){
    return;
  }
  
  // Add properties
  var props = {};
  childTab.find('.keyTab, .propTab').each(function(){
    $(this).find('tr').each(function(){

       var childProp = $(this).find('a').not('.propertyLabel').html() || $(this).find('input').val();

       if(childProp !== undefined && childProp !== '' && $(this).find('.usePropForCreate:first').is(':checked')){
         props[$(this).find('.propertyLabel').html()] = childProp;
       }
    });
  });
  
  var children  = getChildren(childTab);
  var childKeys = Object.keys(children);

  for(var i=0;i<childKeys.length;i++){
   props[childKeys[i]] = children[childKeys[i]];
  }

  return props;
}
// =================================================================
// =================================================================

function checkBatchErrors(responseText){
  var msg;
  
	if(responseText.indexOf('{"error"') != -1 || responseText.indexOf('400 Bad Request') != -1){
		msg           = responseText.split('"value":')[1];
		if(msg)  msg  = msg.split('}')[0];
		else	msg     = responseText.split('innererror><m:message>')[1].split('<')[0];
		
		alert(msg);
		
		return true;
	}
	
	return false;
}