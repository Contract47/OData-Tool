function addButton(id,text,container,onclick,disabled,tooltip,imgSrc){
  
	var button	                    = document.createElement('button');
	
	if(id)        button.id         = id;
	if(text)      button.innerHTML  = text;
	if(onclick)   button.onclick    = onclick;
	if(disabled)  button.disabled   = disabled;
	if(tooltip)   button.title      = tooltip;
	
	if(imgSrc){
  	var img                         = document.createElement('img');
  	img.src = imgSrc;
  	img.style.height = "100%";
  	
  	if(disabled){
      img.style.opacity      = "0.40";
  	}
	  button.appendChild(img);
	}
	
	container.appendChild(button);
	
	button.style["vertical-align"] = "top";
	button.style.height = "100%";
	
	return button;
}


function addKeyValues(ids,content){
	if(!ids){ return; }
	
	var keys = Object.keys(ids);
	for(var i in keys)  ids[keys[i]].value = content[keys[i]];
	return ids;
}

// Check if property is selected through url parameters
// NOTE: always true if no select parameter set
function isURLSelected(property){
  
  var selectionStr = window.location.href.match(/\$select=[^&]*/);
  
  if(!selectionStr){ return true; }
  
  selectionStr = selectionStr[0];
  
  // Check if property is in between with comma or last,
  // Otherwise e.g. 'Status' is also found if 'StatusID' is selected
  var indexBtw  = selectionStr.indexOf(property+',');
  var indexLast = selectionStr.lastIndexOf(property);
  
  return (indexBtw !== -1 || ( (indexLast !== -1) && (selectionStr.length === indexLast + property.length) ) );
}

// Check if property is expanded through url parameters
// NOTE: always false if no expand parameter set
function isURLExpanded(property){
  
  var expansionStr = window.location.href.match(/\$expand=[^&]*/);
  
  if(!expansionStr){ return false; }
  
  expansionStr = expansionStr[0];
  
  // Check if property is in between with comma or last,
  // Otherwise e.g. 'Status' is also found if 'StatusID' is selected
  var indexBtw  = expansionStr.indexOf(property+',');
  var indexLast = expansionStr.lastIndexOf(property);
  
  return (indexBtw !== -1 || ( (indexLast !== -1) && (expansionStr.length === indexLast + property.length) ) );
}

function getEntityUrl(ids){	
	if(!ids){ return; }
	
	var idStr,prop,value;
	
	// Concatenate IDs
	if(Object.keys(ids).length > 1){
	  idStr = "";
	  
		for(i=0;i<Object.keys(ids).length; i++){
		  prop  = Object.keys(ids)[i];
		  value = ids[prop].value;
		  
			if(prop) idStr += prop+'='+wrapIdValue(value,ids[prop].type)+',';
		}

		idStr = idStr.substring(0,idStr.length-1);
	
	// Wrap single ID
	}else{
	  prop  = Object.keys(ids)[0];
	  value = ids[prop].value;
	  idStr = wrapIdValue(value,ids[prop].type);
	}				
	
	return idStr;
}

var _metaObjects = [];
var _objCnt = 0;

function getObjects(obj, key, val,path,subobj) {
  
  // ===============================================================
  // Test performance with this, metaObjects might become very huge!
  // On the other hand => this should be just references
  // ===============================================================
  /*var objID;
  
  if(!subobj){
    objID = obj["____uniqueIdentifier"];
    
    if(!objID){
      objID = _objCnt++;
      obj["____uniqueIdentifier"] = objID;
    }
    
    if(!_metaObjects[objID]){            _metaObjects[objID]            = {};   }
    if(!_metaObjects[objID][key]){       _metaObjects[objID][key]       = {};   }
    if(!_metaObjects[objID][key][val]){  _metaObjects[objID][key][val]  = {};   }
    if(Object.keys(_metaObjects[objID][key][val]).length > 0){
        return _metaObjects[objID][key][val];  
    }
  }*/
  // ===============================================================
  
	var objects = [];
	for (var i in obj) {
	
		var subpath = (path)? path+'.'+i : i;
			
		if (!obj.hasOwnProperty(i)) continue;
		if (typeof obj[i] == 'object') {
			objects = objects.concat(getObjects(obj[i], key, val,subpath,true));
		} else if (i == key && obj[key] == val) {
			obj["__navPath"] = subpath;
			objects.push(obj);
		}
	}
  
  // ===============================================================
  // Test performance with this, metaObjects might become very huge!
  // ===============================================================
  /*if(!subobj){
    _metaObjects[objID][key][val] = objects;
  }*/
  // ===============================================================
  
	return objects;
}

// Collect values of properties with given name
// [{ name: 'a',x=2},{name:'b',x=3} => propName = name => {a:true,b:true}
// can be used for checks like "if(props[name] == true){...}"
function collectProps(obj,prop){
  var props = {};
  
	for (var i in obj) {
		if (!obj.hasOwnProperty(i)) continue;
		if (typeof obj[i] == 'object') {
			jsonConcat(props,collectProps(obj[i], prop));
		} else if (i == prop) {
			props[obj[i]] = true;
		}
	}

	return props;
}

function isJson(string){
	if(!string){
		return false;
	}
	return (/^[\],:{}\s]*$/.test(string.replace(/\\["\\\/bfnrtu]/g, '@').
	replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
	replace(/(?:^|:|,)(?:\s*\[)+/g, '')));
}

function jsonConcat(o1, o2, asClone) {
  var object1 = (asClone)?  jQuery.extend(true, {}, o1) : o1;
  var object2 = o2;
  
  for (var key in object2) {
    object1[key] = object2[key];
  }
  
  return object1;
}

function array2JSON(array){
  if(!array) return;
  
  var json = {};
  
  for(var i=0; i<array.length; i++){
    json[i] = array[i];
  }
  
  return json;
}

function json2Array(json){
  
  if(!json){ return []; }
  if(json.constructor == Array){ return json; }
  var array = [];
  
  for(var i=0; i<Object.keys(json).length; i++){
    array.push(json[Object.keys(json)[i]]);
  }
}

function wrapIdValue(id,type){
	switch(type){
  	case 'Edm.Guid':
  		return "guid'"+id+"'";
  	case 'Edm.Binary':
  		return "X'"+id+"'";
  	case 'Edm.Int32':
  		return id;
  	default:
  		return "'"+id+"'";
  	}
}