var _borderRadius = '10px';
var _bgColor      = 255;
var _bgColorStep  = 20;

function formatContent(obj,entityName){
  
	var formattedContent  = toTab(obj,true, ''+entityName,null,_bgColor);
	formattedContent.id   = "formattedContent";
	loading.style.display = 'none';
	
	var tabContainer 	    = document.createElement('table');
	var tabContainerRow 	= tabContainer.insertRow();
	var tabContainercell  = tabContainerRow.insertCell();
	
	tabContainercell.appendChild(formattedContent);	

	document.body.appendChild(tabContainer);
	/*
	$('.propTab').each(function(){
	  
	  var elem   = $(this)[0];
	  //$(this)[0].style["overflow-y"] = "scroll";
	  
	  var parent = elem.parentNode;
	  var div    = document.createElement('div');
	  div.appendChild(elem);
	  parent.appendChild(div);
	  
	  
  	$(div).click(function(){
  	  $(this).animate({
        height: "50px"
      }, 500);
  	});  
  	  //$(superTab).toggle(
      //  function(){ $(superTab).animate( { height:"100px" }, { queue:false, duration:500 });  },
      //  function(){ $(superTab).animate( { height:"50px" }, { queue:false, duration:500 }); }
      //);
	});*/
}

function toTab(content,firstlevel,itemName,parents,color){
  
  if(content.results && content.results.constructor === Array){
    content = content.results;
  }
  
  var isCollection = (content.constructor === Array);
  
	var i,j,childElem,childTab,row,cell;
	var colName	  = getCollectionName(itemName,content);
	var ids 		  = getKeyProps( itemName, content );
	
	var superTab  = document.createElement('table');
	//superTab.style['border-style'] = "solid";
	//superTab.style['border-radius'] = _borderRadius;
	//superTab.style.width = '100%';
	superTab.style["background-color"] = "rgb("+color+","+color+","+color+")";
	superTab.className   = 'superTab';
	superTab.style.width = "100%";
	superTab.style['border-radius'] = _borderRadius;
	
	color -= _bgColorStep;
	
	var superWrapper  = document.createElement('div');
	var superWrapper2 = document.createElement('div');
	superWrapper.appendChild(superWrapper2);
	superWrapper2.appendChild(superTab);
	
	superWrapper.style['border-style'] = "solid";
	superWrapper.style['border-radius'] = _borderRadius;
	superWrapper.style.color = "grey";
	superWrapper.style.width = '100%';
	
	if(!firstlevel){
  	// Collapse tabs on click
  	$(superWrapper).click( function(event){
  	  event.stopPropagation();
  	  $(this).children().slideToggle(500);
  	} );
	}
	
	var keyTable = document.createElement('table');
	keyTable.className = 'keyTab';
	var table	   = document.createElement('table');	
	table.id     = itemName;
	table.className = 'propTab';
	//table.style["border-style"] = 'solid';
	//table.style['border-radius'] = _borderRadius;
	table.style.width="100%";
	
	var navTable = document.createElement('table');
	
	if(!content || Object.keys(content).length === 0) return superWrapper;
	
	var properties	= Object.keys(content); 
	var navProps 	  = getNavProps(itemName,content);
	
	// Content is an array => create a new subtable for each entry
	if(isCollection){
	  
	  table.className = 'collectionTab';
	  table.style["border-style"] = "none";
	  table.style['border-radius'] = _borderRadius;
	  
	  //if(parents) parents.pop();
			
		for(i=0; i<properties.length; i++){
			row   = table.insertRow();
			cell  = row.insertCell();
			
			if(firstlevel){ 
				row.className = 'listItem';
				var checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				cell.appendChild(checkbox);				
				cell = row.insertCell();
			}
			
			cell.innerHTML = i;
			cell = row.insertCell();
			
			childElem = toTab(content[properties[i]],(firstlevel && i===0),itemName,parents,color);
			childTab  = $(childElem).find('.superTab')[0];
			
			if(childTab.rows.length > 0) cell.appendChild(childElem);
		}
	}else{

		addKeyValues(ids,content);
		
	  var idStr     = getEntityUrl(ids);
		var entityUrl	= _root+'/'+colName+'('+idStr+')?$format=json';
		var parent    = {"name":itemName,"entityUrl":entityUrl};
  	if(!parents){ parents = [parent]; }
  	else        { 
  	  parents = parents.slice();
  	  parents.push(parent); 
  	}
  	
		properties.sort();
		for(i=0; i<properties.length; i++){
			var property = properties[i];
			var value    = content[property];
			
			if(value && value.constructor === Array){
			  if(value.length === 0) continue;
			  
			  if(property == 'results'){
			    return toTab(value,null,itemName,parents,color);
			  }
				for(j in value){
				  
  				// Key property
  				if(ids && (ids[property] || ids[property] === 0)){
  				  addRow(keyTable, property,value[j],firstlevel,entityUrl,parents,color,item);
  				  
  				// Nav property
  				}else if(typeof value == 'object'){
  				  addRow(navTable, property,value[j],firstlevel,null,parents,color);
  			  
  			  // Default property
  				}else{
  				  addRow(table, property,value[j],firstlevel,null,parents,color);
  				}
				}
			}else{
				if(value && value['__deferred'] !== undefined){continue;}			
				
				// Key property
				if(ids && (ids[property] || ids[property] === 0)){
				  addRow(keyTable, property,value,firstlevel,entityUrl,parents,color);
				  
				// Nav property
				}else if(typeof value == 'object' && value !== null){
				  addRow(navTable, property,value,firstlevel,null,parents,color);
			  
			  // Default property
				}else{
				  addRow(table, property,value,firstlevel,null,parents,color);
				}
			}
			
			// Remove property from nav props
			for(j=0; j<navProps.length; j++){
			  if(navProps[j] == properties[i]){
			    navProps.splice(j,1);
			    break;
			  }
			}
		}
	}
	
	// Add nav props
	//if(table.rows.length > 0){
  	for(i=0; i<navProps.length; i++){
  	  if(isURLSelected(navProps[i])){
  		  addRow(navTable,navProps[i],{},null,null,parents,color);
  	  }
  	}
	//}
	
	// ==============================================================
	// Same here (nothing shown without non-key-properties)
	// ==============================================================
	// Don't add content if there's none to be shown
	if(table.rows.length > 0 || navTable.rows.length > 0 || keyTable.rows.length > 0){
	  
  	var superRow  = superTab.insertRow();
  	
  	var entityTab  = document.createElement('table');
  	var entityRow  = entityTab.insertRow();
  	var entityCell = entityRow.insertCell();
  	
  	if(content.constructor !== Array){
  	  if(firstlevel) entityTab.id = 'mainTab';
    	entityCell.appendChild(keyTable);
    	entityRow  = entityTab.insertRow();
    	entityCell = entityRow.insertCell();
    	
    	// Cut the collection link from one of the key properties
    	if(keyTable.rows.length > 0){
      	var collectionLinkURL = $(keyTable).find(".idFieldLink")[0].href.split('?')[0];
      	collectionLinkURL     = collectionLinkURL.substring(0,collectionLinkURL.lastIndexOf('('));
      	
      	var collectionLink = document.createElement('a');
      	collectionLink.href = collectionLinkURL+'?$format=json';
      	var collectionImg  = document.createElement('img');
      	collectionImg.src = "http://cdn.flaticon.com/png/64/23/23639.png";
      	collectionImg.style.height = "25px";
      	collectionImg.title = "Show Collection";
      	collectionLink.appendChild(collectionImg);
      	entityCell.appendChild(collectionLink);
    	}
    	
    	if(table.rows.length > 0){
      	var propLabel = document.createElement('p');
      	propLabel.innerHTML = '<b><u>Properties:</u></b>';
      	
      	var txtColor = 255-color;
      	if(Math.abs(color-txtColor) <= 50) txtColor -= 1.5*(color-txtColor);
      	
      	propLabel.style["color"] = "rgb("+txtColor+","+txtColor+","+txtColor+")";
  	
      	entityCell.appendChild(propLabel);
    	  entityRow  = entityTab.insertRow();
    	  entityCell = entityRow.insertCell();
    	}
	// ==============================================================
	}
	// ==============================================================
  	
  	var propWrapper = document.createElement('div');
  	var propWrapper2 = document.createElement('div');
  	propWrapper.appendChild(propWrapper2);
  	propWrapper2.appendChild(table);
  	entityCell.appendChild(propWrapper);
  	
  	var superCell = superRow.insertCell();  
  	superCell.setAttribute("valign","top");
  	superCell.appendChild(entityTab);
  	
  	if(content.constructor !== Array){
    	superCell = superRow.insertCell();
    	superCell.setAttribute("valign","top");
    	superCell.appendChild(navTable);
  	}
  	
  	// Collapse properties on click
  	if(!isCollection){
  	  propWrapper.style["border-style"] = "solid"; 
  	  propWrapper.style["border-radius"] = "10px";
  	  propWrapper.style.width = "100%";
  	  propWrapper.style["border-color"] = "grey";
  	  propWrapper.className = "propWrap";
  	  /*
	    $(table).children().each(function(){
    	  if(!propsFlag.checked) this.style.display = "none";
      });
	    */
    	$(propWrapper).click( function(event){
    	  event.stopPropagation();  	
    	  $(this).children().slideToggle(500);
    	});
  	}
  	/*
  	if(!firstlevel){
  	  superTab.tBodies[0].style.display = "none";
  	}*/
	}
	/*
	return createSuperTab((!isCollection)? keyTable : null,
	                      (!isCollection)? table :null,
	                      (!isCollection)? navTable : null,
	                      (isCollection)?  table :null,
	                      (firstlevel && !isCollection)?    'mainTab':null);
	                      */
      
  return superWrapper;
}

/*
function createSuperTab(keyTab,propTab,navTab,collectionTab,id){
  
  	var superTab  = document.createElement('table');
  	superTab.style['border-style'] = "solid";
	  superTab.style['border-radius'] = _borderRadius;
  	superTab.style.width = '100%';
  	superTab.className   = 'superTab';
  	
  	var superRow  = superTab.insertRow();
  	
  	var entityTab  = document.createElement('table');
  	var entityRow  = entityTab.insertRow();
  	var entityCell = entityRow.insertCell();
  	
  	if(keyTab){
  	  if(id) entityTab.id = 'mainTab';
    	entityCell.appendChild(keyTab);
    	entityRow  = entityTab.insertRow();
    	entityCell = entityRow.insertCell();
  	}
  	
  	if(propTab){
    	var propLabel = document.createElement('p');
    	propLabel.innerHTML = '<b><u>Properties:</u></b>';
    	entityCell.appendChild(propLabel);
  	  entityCell.appendChild(propTab);
  	  entityRow  = entityTab.insertRow();
  	  entityCell = entityRow.insertCell();
  	}
  	
  	var superCell = superRow.insertCell();
  	superCell.setAttribute("valign","top");
  	superCell.appendChild(entityTab);
  	
  	if(navTab){
    	superCell = superRow.insertCell();
    	superCell.setAttribute("valign","top");
    	superCell.appendChild(navTab);
  	}
  	
  	//if(!firstlevel){
  	//  superTab.tBodies[0].style.display = "none";
  	//}
  	
  	return superTab;
}*/


function addRow(table,property,value,firstlevel,entityUrl,parents,color){
  var link,i,date;
  
	if( !property || property.indexOf('odata') === 0 || property.indexOf('odata') == 1){ //@odata or odata
		return;
	}
	
	//if(typeof value != 'object'){
  	var row   = table.insertRow();
  	var cell1 = row.insertCell();
  	cell1.setAttribute("valign","top");
  	var cell2 = row.insertCell();
  	
  	var label       = document.createElement('a');
  	label.innerHTML = property;
  	label.className = 'propertyLabel';
  	
  	var txtColor = 255-color;
  	if(Math.abs(color-txtColor) <= 50) txtColor -= Math.round(1.5*(color-txtColor));
  	
  	label.style["color"] = "rgb("+txtColor+","+txtColor+","+txtColor+")";
  	
  	cell1.appendChild(label);
  	
  	var input = document.createElement('input');
  	
  	if(firstlevel){ input.className = 'propertyInput'; }
  	input.setAttribute("readonly",true);
  	input.style['border-style'] = "none";    
  	input.style["background-color"] = "rgb("+color+","+color+","+color+")";
  	input.style["color"] = "rgb("+txtColor+","+txtColor+","+txtColor+")";
  	$(input).click( function(event){
  	  event.stopPropagation();
  	} );
  				
		//add property text
  	if( typeof value != 'object'){
  	  //format date if necessary (the proper way would be to check this entity's type in metadata)
  		if(typeof value == "string" && value.match(/\/Date\([^)]*\)\//)){
        date    = new Date(parseInt(value.substr(6)));
        
        if(_UTCTime.checked){
          date        = new Date(date.getTime()+date.getTimezoneOffset()*60000);
        }
        value       = date.getFullYear()+'-'+("0"+(date.getMonth()+1)).slice(-2)+'-'+("0"+date.getDate()).slice(-2)+'T'+
                      ("0"+date.getHours()).slice(-2)+':'+("0"+date.getMinutes()).slice(-2)+':'+("0"+date.getSeconds()).slice(-2);
  		}       
  		input.value     = value;
  		cell2.appendChild(input);
  	}else if(value){
  	  
	    var expandPath = '';
	    var navPath    = '';
  	 
  	  // Nav properties
  	  //----------------------------------------
  	  
  	  // Collect expansion properties & nv path 
  	  if(parents){
  	    for(i=1; i<parents.length; i++){  // For expand, the main/first entity is not required
  	      expandPath  += parents[i].name+'/';
  	    }
  	    
  	    expandPath  += property;
  	    navPath      = parents[parents.length-1].entityUrl.split('?')[0] +'/'+property;
  	    
  	    label.href = navPath + '?$format=json';
  	  }
  	  
  	  // Add expand-link if value is an empty object (set on purpose)
  	  if(Object.keys(value).length === 0 && parents){
  	    
  	    link            = document.createElement('a');
  	    link.className  = 'expandLink';
    		link.href       = window.location.href.replace('expand=','expand='+expandPath+',');
  		
    		if(link.href.indexOf('expand='+expandPath) == -1){
    		  link.href = window.location.href + ((window.location.search)? '&' : '?') + '$expand='+expandPath;
    		}
    		
    		link.style.color = "rgb("+txtColor+","+txtColor+","+txtColor+")";
    		
    		var linkImg     = document.createElement("img");
    		linkImg.src     = "http://cdn.flaticon.com/png/64/61/61728.png";
  	    linkImg.title   = 'Expand';
  	    linkImg.style.height = "18px";
    		link.appendChild(linkImg);
  	    
  	    var directLink              = document.createElement("a");
  	    directLink.href             = label.href;
  	    
  	    var directLinkImg           = document.createElement("img");
  	    directLinkImg.src           = "http://cdn.flaticon.com/png/64/60/60546.png";
  	    directLinkImg.style.height  = "18px";
  	    directLinkImg.title         = "Go To";
  	    directLink.appendChild(directLinkImg);
  	    
  		  cell2.appendChild(link);
  	    cell2.appendChild(directLink);
  	  
  	  // Otherwise add the contained object
  	  }else{
  	    var childElem = toTab(value,null,property,parents,color);
  	    var childTab  = $(childElem).find('.superTab')[0];
  	    if(childTab.rows.length > 0) cell2.appendChild(childElem);
  	  }
  	}else{
  		cell2.appendChild(input);
  	}
  	
  	if(entityUrl){
  	  link  = document.createElement('a');
  		link.href = entityUrl;
  		
  		var dateKeys = link.href.match(/'\/Date[^']*'/) || [];
  		
  		for(i=0; i<dateKeys.length; i++){
        date    = new Date(parseInt(dateKeys[i].substr(7).split(")")[0]));
        
        if(_UTCTime.checked){
          date        = new Date(date.getTime()+date.getTimezoneOffset()*60000);
        }
        var dateStr = date.getFullYear()+'-'+("0"+(date.getMonth()+1)).slice(-2)+'-'+("0"+date.getDate()).slice(-2)+'T'+
                      ("0"+date.getHours()).slice(-2)+':'+("0"+date.getMinutes()).slice(-2)+':'+("0"+date.getSeconds()).slice(-2);
                      
        link.href = link.href.replace(dateKeys[i],"datetime'"+dateStr+"'");
  		}
  		
  		link.innerHTML = value;
  		link.className = "idFieldLink";
  		cell2.appendChild(link);
  		
  		input.style.display = "none";
  		input.className = "idFieldInput";
  	  input.removeAttribute("readonly");
  	  input.style['border-style'] = "solid";
  		link.style.color = "rgb("+txtColor+","+txtColor+","+txtColor+")";
  	}
  	
  	return row;
}