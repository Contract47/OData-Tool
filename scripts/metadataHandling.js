var _keysPerEntity = {};

function formatKey(key,entityName){	

	if(_keysPerEntity[entityName]) return jQuery.extend(true, {}, _keysPerEntity[entityName]);
	
	var i,j,props;
	var ids 		= {};
	var objects = getObjects(_metadata.Edmx.DataServices.Schema,'_Name',entityName);
	
	if(key){
		if(key.PropertyRef.constructor !== Array){
		  key.PropertyRef = [key.PropertyRef];
		}
		
		// Loop over keys
		for(i=0; i<key.PropertyRef.length; i++){										
			// Loop over entities
			for(j=0; j<objects.length; j++){
				props = objects[j].Property;
				
				if(!props) continue;
				
				// Loop over entity properties
				for(var k=0;k<props.length;k++){
					if(props[k]["_Name"] == key.PropertyRef[i]["_Name"]){
						ids[key.PropertyRef[i]["_Name"]] = { type: props[k]["_Type"] };
					}
				}
			}
		}
	}
	
	_keysPerEntity[entityName] = ids;
	return _keysPerEntity[entityName];
}

var _entityNames = {};
function getEntityName(name,content){
  
  // Load from buffer
  if(_entityNames[name]){ return _entityNames[name]; }
  
  var entityName;
	var objects   = getObjects(_metadata,'_Name',name);
	
	// Collection found
	objectlist:
	for(var i=0; i<objects.length; i++){
		if(objects[i]["_EntityType"]){	// EntitySet found
			entityName = objects[i]["_EntityType"].substring(objects[i]["_EntityType"].lastIndexOf('.')+1,objects[i]["_EntityType"].length);
			_entityNames[name] = entityName;
			return entityName;
			
		}else if(objects[i].Key){		// Entity found
      
      if(isEntityNameValid(objects[i]["_Name"],content)){
        _entityNames[name] = objects[i]["_Name"];
        return objects[i]["_Name"];
      }
		}else if(objects[i]["_Relationship"]){
			var relationships = getObjects(_metadata, '_Name',objects[i]["_Relationship"].split('.').slice(-1)[0]); // GET LAST TERM
			
			for(var m=0; m<relationships.length;m++){
				if(relationships[m].End){
					for(var n=0;n<relationships[m].End.length; n++){
						if(relationships[m].End[n]["_Role"] == objects[i]["_ToRole"] && relationships[m].End[n]["_Type"]){
							entityName = relationships[m].End[n]["_Type"].split('.').slice(-1)[0]; // GET LAST TERM
              
              if(isEntityNameValid(entityName,content)){
                _entityNames[name] = entityName;
                return entityName; 
              }
						}
					}
				}
			}
		}
	}
}

// Try to add parents instead of properties
// (recursive check required, e.g. Item/Parent/Parent/Parent)
var _entityProps = {};
function isEntityNameValid(name,props){
  
  if(!name) return false;
  
  if(props && props.constructor === Array){ 
      props = props[0];
  }
  
  if(props){
    
  	var metaProps;
	  
    // Load from buffer
    if(_entityProps[name]){ metaProps = _entityProps[name]; }
    else{
    	var objects   = getObjects(_metadata,'_Name',name);
    	
    	// Find entity properties in metadata
    	objectlist:
    	for(var i=0; i<objects.length; i++){
    	  if(objects[i].Key){		// Entity found
    	    var keys     = json2Array(objects[i].Key) || json2Array(objects[i].Key.PropertyRef);
    	    var objProps = objects[i].Property;
    	    var navProps = objects[i].NavigationProperty;
    	    var allProps = (keys||[]).concat(objProps||[]).concat(navProps||[]);
    	    metaProps    = collectProps(allProps, '_Name');
          break;
  		  }
    	}
    	
    	_entityProps[name] = metaProps;
    }
    
	  // Compare properties
    proplist:
    for(var j=0; j<Object.keys(props).length; j++){
      var prop = Object.keys(props)[j];
      
      if(metaProps[prop] !== true){
        //console.log('unknown property '+prop+' for entity '+name+', wrong entity');
        return false;
      }
    }
  }
  
  return true;
}

var _entitySetValidName = {};
function isEntitySetNameValid(name,props){
  
  if(!name) return false;
  
  if(props && props.constructor === Array){ 
      props = props[0];
  }
  
  if(props){
	  
	  if(_entitySetValidName[name]){ entityName = _entitySetValidName[name]; }
	  else{
    	var objects   = getObjects(_metadata,'_Name',name);
    	
    	// Find entity properties in metadata
    	for(var i=0; i<objects.length; i++){
    	  if(objects[i]["_EntityType"]){		// EntitySet found
    	    entityName = objects[i]["_EntityType"].split('.');
    	    entityName = entityName[entityName.length-1];
    	    break;
  		  }
    	}
	  }
	  
  	if(entityName){
  	  _entitySetValidName[name] = entityName;
  	  return isEntityNameValid(entityName,props);
  	}
  }
  
  return true;
}

var _colNames = {};
function getCollectionName(name,props){
	
	// Load from buffer
	if(_colNames[name]){ return _colNames[name]; }
	
	var objects = getObjects(_metadata, '_Name', name);
	var j = 0;
	
	for(var i=0; i<objects.length; i++){
	
		// Name is already a collection name
		if(objects[i]["__navPath"].indexOf('EntitySet') != -1){
		  _colNames[name] = name;
			return name;
			
		// Navigation property found
		} else if(objects[i]["__navPath"].indexOf('NavigationProperty') != -1){
			var navObjects = getObjects(_metadata, '_Role', objects[i]["_ToRole"]);
			
			if(!navObjects || navObjects.length === 0){
				for(j=0; j<_namespaces.length; j++){
					 navObjects = getObjects(_metadata, '_EntityType', _namespaces[j]+'.'+objects[i]["_Name"]);
					 if(navObjects && navObjects.length > 0) break;
				}
			}
			
			if(!navObjects || navObjects.length === 0) continue;
			
			for(j in navObjects){
			  var collectionName = navObjects[j]["_EntitySet"] || navObjects[j]["_Name"];
				
				if(isEntitySetNameValid(collectionName,props)){
				  _colNames[name] = collectionName;
				  return collectionName;
				}
			}
		}else{
			//console.log(objects[i]);
		}
	}
}


function getKeyProps(name,content){
  
	var ids 			  = {};
	var entityName 	= getEntityName(name,content);	
	
	if(_keysPerEntity[entityName]) return jQuery.extend(true, {}, _keysPerEntity[entityName]);
	
	var objects 		= getObjects(_metadata, '_Name', entityName);
	
	for(var i=0; i<objects.length; i++){
		//entityType = objects[i]["_EntityType"];
		
		if(objects[i].Key){
			$.extend( true, ids, formatKey(objects[i].Key,entityName));
			return ids;				
		}
	}
}

var _navProps = {};
function getNavProps(name,content){
  
  if(_navProps[name]){
	  return _navProps[name].slice();
  } 
  
	var entityName 	= getEntityName(name,content);
	var navProps 	  = [];
	var objects 		= getObjects(_metadata,'_Name',entityName);
	
	if(!objects) return [];
	
	for(var i=0; i<objects.length; i++){
		if(!objects[i].NavigationProperty) continue;
		
		navPropObjects 	= objects[i].NavigationProperty;
		
		if(navPropObjects.constructor === Array){
			for(var j=0; j<Object.keys(navPropObjects).length; j++){
				navProps.push(navPropObjects[Object.keys(navPropObjects)[j]]["_Name"]);
			}
		}else{
			navProps.push(navPropObjects["_Name"]);
		}
	}
	
	 _navProps[name] = navProps;
	 
	return navProps.slice(); //Clone
}

var _propTypes = {};
function getPropertyTypes(entityName){
  
  if(!entityName) return;
  
  if(_propTypes[entityName]) return _propTypes[entityName];
  
  var propTypes = {};
	var objects   = getObjects(_metadata.Edmx.DataServices.Schema,'_Name',getEntityName(entityName));
	
	for(var i=0; i<objects.length; i++){
	  var props     = objects[i].Property;
	  
	  if(!props){ continue; }
	  
  	for(var j=0; j<props.length; j++){
  	  propTypes[props[j]["_Name"]] = props[j]["_Type"];
  	}
  	
  	_propTypes[entityName] = propTypes;
  	return propTypes;
	}
	
	return {};
}

function processMetadata(metadataStr){
  
	var x2js	= new X2JS();
	_metadata   = x2js.xml_str2json( metadataStr );
	if(_metadata.Edmx.DataServices.Schema["_Namespace"]){
		_namespaces.push(_metadata.Edmx.DataServices.Schema["_Namespace"]);
	}else{
		for(i=0; i<_metadata.Edmx.DataServices.Schema.length;i++){
			_namespaces.push(_metadata.Edmx.DataServices.Schema[i]["_Namespace"]);
		}
	}
	
	_root = _metapath.split('/$')[0];
	
	if(_services && !_services[_initRoot]){
	  addService(_initRoot,_root+'/$metadata',true);
	}
  	
	buildUI();
}
function handleMetadata(){
	var xmlhttpGET  = (window.XMLHttpRequest)? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	var ids         = {};
	
	xmlhttpGET.onreadystatechange = function()
	{
	  var i=0;
	  var metapath;
	  
		if (xmlhttpGET.readyState==4 && xmlhttpGET.status==200){
		  processMetadata(xmlhttpGET.responseText);
		}else  if (xmlhttpGET.readyState==4 && xmlhttpGET.status==404){
			// Metadata not found => try increasing path until it is reached
			if( (_path.match(/\(/g) || []).length > 1){
				var rest    = _path.replace(_root+'/','');  // Get rest of the path	
				var oldRoot = _root;
				_root += '/'+rest.split('/')[0];		        // Add next part
				
				if(oldRoot != _root) 	handleMetadata();     // Try again, stop if path is the same
				else				alert('Metadata not found');
			}
		}
	};
	
	if(window.location.href.indexOf('$metadata') != -1){
	  _metapath = window.location.href;
	  _root     = _metapath.split('/$metadata')[0];
	  processMetadata(_content);
	  return;
	}
	
	_metapath =  ((_services)? _services[_initRoot] : null) || _root+'/$metadata';
  
	xmlhttpGET.open("GET",_metapath,true);
	xmlhttpGET.setRequestHeader ('X-CSRF-Token', 'Fetch');
	xmlhttpGET.send();
}

