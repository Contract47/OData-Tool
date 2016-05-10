var _content,_path,_root,_initRoot,_entityName,_batchMode,_contentObj,_editMode,_isSingleEntity,_metadata,_odata_version,_namespaces,_count,_stepSize,_metapath,
_namespaces = [];

chrome.storage.sync.get({enabled:true}, function(options) {
  if(options.enabled){
    if(document.getElementById("loadButton")){
      loadButton.onclick = loadContent;
    }else{
      _content = document.body.firstChild.innerHTML;
      //_content = decodeURIComponent(escape(document.body.firstChild.innerHTML));
      _path    = window.location.href.split('?')[0];
      _root    = _path.split('(')[0];
      _root 	     = _root.substring(0,_root.lastIndexOf('/'));
      _initRoot    = _root;
      
      _entityName = _path.substring(_path.lastIndexOf('/')+1,_path.length).split('?')[0].split('(')[0];
      _count    = 0;
      _stepSize = 5;
      
      _top = window.location.search.match(/\$top[^&]*/) || 0;
      _top     = parseInt((_top)? _top[0].split('=')[1] : 0);
      
      if(_top) _stepSize = _top;
      
      _skip = window.location.search.match(/\$skip[^&]*/) || 0;
      _skip     = parseInt((_skip)? _skip[0].split('=')[1] : 0);
      
      run();
    }
  }
});

function loadContent(){
  
  var xmlhttpGET  = (window.XMLHttpRequest)? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
              	
	xmlhttpGET.onreadystatechange = function()
	{
		if (xmlhttpGET.readyState==4 && xmlhttpGET.status==200){
		  var node = document.createElement('p');
		  node.innerHTML = xmlhttpGET.responseText;
		  document.body.insertBefore(node,document.body.firstChild);
		    
      _content = document.body.firstChild.innerHTML;
      //_content = decodeURIComponent(escape(document.body.firstChild.innerHTML));
      _path    = serviceURL.value.split('?')[0];
      _root    = _path.split('(')[0];
      _root 	     = _root.substring(0,_root.lastIndexOf('/'));
      _initRoot    = _root;
      
      _entityName = _path.substring(_path.lastIndexOf('/')+1,_path.length).split('?')[0].split('(')[0];
      _count    = 0;
      _stepSize = 5;
      
      _top = serviceURL.value.match(/\$top[^&]*/) || 0;
      _top     = parseInt((_top)? _top[0].split('=')[1] : 0);
      
      if(_top) _stepSize = _top;
      
      _skip = serviceURL.value.match(/\$skip[^&]*/) || 0;
      _skip     = parseInt((_skip)? _skip[0].split('=')[1] : 0);
      
		  run();
		}
	};
	
	xmlhttpGET.open("GET",serviceURL.value,true);
	xmlhttpGET.send();
}

function run(){

  if(isJson(_content) || window.location.href.indexOf('$metadata') != -1){
    readAllFromDB();
  }
}

function init(){

  // Send messages to extension
  chrome.runtime.sendMessage(chrome.runtime.id,{active: false});
  
  handleMetadata();

  //listen for messages coming from extension
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      switch(request.method){
        case "getMetadata":
          var metadata = getMetadata();
          sendResponse({metadata: metadata,initRoot:_initRoot,root:_root});
          break;
        case "getServices":
          sendResponse({services: _services});
          break;
        case "reload":
          location.reload();
          break;
      }
    }
  );
}

function buildUI(){
  
  // Navigate through arrow keys
  $(document.body).keydown( function(e){
      if(e.target === document.body){
        if(e.which == 37) prevPage();
        if(e.which == 39) nextPage();
      }
  });
  
  chrome.runtime.sendMessage(chrome.runtime.id,{active: true});
  
  if(!isJson(_content)) return;
  
  if(_metadata){
  	_odata_version = _metadata.Edmx.DataServices["_m:MaxDataServiceVersion"] || // 3.0
  	                 _metadata.Edmx.DataServices["_m:DataServiceVersion"] ||   // 2.0
  	                 _metadata.Edmx["_Version"];                                // 4.0
  }
  
	document.body.removeChild(document.body.firstChild);
  
  // Remove content not required
  var slimContent = _content.replace(new RegExp(',"[^"]*":{"__deferred[^}]*}}','g'),'').
                             replace(new RegExp('"__metadata[^}]*},','g'),'');

	_contentObj = jQuery.parseJSON(slimContent);

	// Adjust content according to odata version
	switch(_odata_version){
	  case '1.0': // Fall through, same as 2.0
	  case '2.0':
	    if(_contentObj.d){
	      _contentObj = _contentObj.d;
	      _count      = _contentObj["__count"];
      }
	    if(_contentObj.results && _contentObj.results.constructor === Array)  _contentObj = _contentObj.results;
			delete _contentObj["__metadata"];
	    break;
	  case '3.0':
	    _count = _contentObj["odata.count"];
	    if(_contentObj.value && _contentObj.value.constructor === Array) _contentObj = _contentObj.value;
			delete _contentObj["odata.metadata"];
	    break;
	  case '4.0':
	    _count = _contentObj["@odata.count"];
	    if(_contentObj.value && _contentObj.value.constructor === Array) _contentObj = _contentObj.value;
			delete _contentObj["@odata.context"];
	    break;
	}
	
	_isSingleEntity = (_contentObj.constructor !== Array);
	
	// =========================================================
	// Add Toolbar
	// =========================================================
	addToolbarButtons();
	document.body.appendChild(document.createElement('br'));
	
	// =========================================================
	// Add Source Content
	// =========================================================
	var source = document.createElement('textarea');
	source.id = 'sourceContent';
	source.innerHTML = _content;
	source.style.width   = "100%";
	source.style.height  = "100%";
	source.style.display = "none";
	source.style["border-style"] = "none";
	source.setAttribute("readonly",true);
	
	document.body.appendChild(source);
	
	// =========================================================
	// Add Loading Text
	// =========================================================
	var loading = document.createElement('p');
	loading.id = 'loading';
	loading.innerHTML = 'Loading content, please wait';
	document.body.appendChild(loading);
	
	// =========================================================
	// Add Count Information
	// =========================================================
	if(_count){
  	var countLabel = document.createElement('label');
  	countLabel.innerHTML = _count + ' entries found:';
  	document.body.appendChild(countLabel);
	}
	
	// =========================================================
	// Add content
	// =========================================================
	var format_start = new Date().getTime();
	formatContent(_contentObj,_entityName);
	var format_end = new Date().getTime();
	console.log('Formatting time: '+(format_end-format_start));
	
	// Remove refs button if no refs available
	if($('.expandLink').length === 0){ buttons.removeChild(loadRefsButton); }
	if(window.location.href.indexOf("$expand") === -1){ buttons.removeChild(removeRefsButton); }
}

function getMetadata(){
  return _metadata;  
}

function addToolbarButtons(){
  
	// =========================================================
  // CRUD Buttons
	// =========================================================
	var buttons = document.createElement('div');
	buttons.id  = 'buttons';
	
	//buttons.style.float= "top";
	buttons.style.position= "fixed";
	buttons.style["margin-top"] = '-10px';
	buttons.style["background-color"] = 'grey';
	buttons.style.height = "25px";
	buttons.style.width = "100%";
	
	addButton('editButton',		'', buttons, toggleEditable,	null,              	'Edit', 									"http://cdn.flaticon.com/png/64/61/61456.png");
	addButton('createButton',	'', buttons, create,			_isSingleEntity,	(_isSingleEntity)? 'Navigate to EntitySet for entity creation':'Create',     "http://cdn.flaticon.com/png/64/95/95029.png");
	addButton('updateButton',	'', buttons, update,			!_isSingleEntity,	(!_isSingleEntity)? 'Navigate to Single Entity for entity updates':'Update', "http://cdn.flaticon.com/png/64/69/69645.png");
	addButton('deleteButton',	'', buttons, del,				null,               'Delete',     								"http://cdn.flaticon.com/png/64/63/63260.png");
	addButton('sourceButton',	'', buttons, showSource,		null,               'Show source',								"http://cdn.flaticon.com/png/64/14/14460.png");
	addButton('zipButton',		'', buttons, generateZip,		null, 				'Generate Zip file from full service data',	"http://image005.flaticon.com/159/png/128/136/136462.png");
	
	// =========================================================
  // Batch mode checkbox
	// =========================================================
	_batchMode = document.createElement('input');
	_batchMode.type = 'checkbox';
	_batchMode.id = 'batchMode';
	_batchMode.style["vertical-align"] = "top";
	
  chrome.storage.sync.get({batch:false}, function(options) {
  	if(options.batch){
  	  $(_batchMode).prop('checked', true);
  	  //openProps = true;
  	}else{
  	  $(_batchMode).removeAttr('checked');
  	  //openProps = false;
  	}
  });
	
	_batchMode.onclick = function(){
	  chrome.storage.sync.set({batch: _batchMode.checked});
	};
	
	var batchModeLabel = document.createElement('label');
	batchModeLabel.innerHTML = 'Batch Mode';
	batchModeLabel.style["vertical-align"] = "top";
	
	var batchBlock = document.createElement("span");
	batchBlock.appendChild(_batchMode);
	batchBlock.appendChild(batchModeLabel);
	buttons.appendChild(batchBlock);
	
	$(batchBlock).hide();
	
	//var openProps;
	
	//addButton('showChildrenButton','show refs',buttons,function(){$('.superTab').children().slideDown(1000);});
 	
	// =========================================================
  // Display properties checkbox
	// =========================================================
	propsFlag         = document.createElement('input');
	propsFlag.type    = 'checkbox';
	propsFlag.id      = 'propsFlag';
	propsFlag.style["vertical-align"] = "top";
	
  chrome.storage.sync.get({properties:true}, function(options) {
  	if(options.properties){
  	  $(propsFlag).prop('checked', true);
  	  //openProps = true;
	    $('.propWrap').children().slideDown(1000);
  	}else{
  	  $(propsFlag).removeAttr('checked');
  	  //openProps = false;
  	  $('.propWrap').children().slideUp(0);
  	}
  });
	
	propsFlag.onclick = function(){
	  chrome.storage.sync.set({properties: propsFlag.checked});
	  
	  if(!propsFlag.checked){
	    $('.propWrap').children().slideUp(1000);
	    //openProps = false;
	  }else{
	    $('.propWrap').children().slideDown(1000);
	    //openProps = true;
	  }
	};
	
	var propsFlagLabel = document.createElement('label');
	propsFlagLabel.innerHTML = 'Properties';
	propsFlagLabel.style["vertical-align"] = "top";
	
	var propsBlock = document.createElement("span");
	propsBlock.appendChild(propsFlag);
	propsBlock.appendChild(propsFlagLabel);
	buttons.appendChild(propsBlock);
	
	$(propsBlock).hide();
  
	// =========================================================
  // UTC Time checkbox
	// =========================================================
	_UTCTime = document.createElement('input');
	_UTCTime.type = 'checkbox';
	_UTCTime.id = 'utcTime';
	_UTCTime.style["vertical-align"] = "top";
	
  chrome.storage.sync.get({utc:false}, function(options) {
  	if(options.utc){
  	  $(_UTCTime).prop('checked', true);
  	}else{
  	  $(_UTCTime).removeAttr('checked');
  	}
  });
  
	_UTCTime.onclick = function(){
	  chrome.storage.sync.set({utc:_UTCTime.checked});
	};
	
	var utcTimeIcon = document.createElement('img');
	utcTimeIcon.src = "http://cdn.flaticon.com/png/64/59/59252.png";
	utcTimeIcon.style.height = "100%";
	utcTimeIcon.title        = 'UTC Time';
	
	var utcBlock = document.createElement('span');
	utcBlock.appendChild(_UTCTime);
	utcBlock.appendChild(utcTimeIcon);
	
	buttons.appendChild(utcBlock);
	$(utcBlock).hide();
	
	// =========================================================
  // Load / Unload references / extensions Button
	// =========================================================
	addButton('loadRefsButton',		'',buttons,expandAll,	null, 'Load references',  	"http://cdn.flaticon.com/png/64/63/63357.png");
	addButton('removeRefsButton',	'',buttons,collapseAll,	null, 'Remove references',	"http://cdn.flaticon.com/png/64/18/18155.png");
	
	/*if(!_isSingleEntity){
  	var searchInput = document.createElement('input');
  	searchInput.id = 'searchInput';
  	searchInput.onkeypress=search;
  	if(window.location.search && window.location.search.indexOf('$filter') != -1){
  	  searchInput.value = decodeURIComponent(window.location.search.split('$filter=')[1].split('&')[0]);
	  }
  	buttons.appendChild(searchInput);
  	
  	searchInput.style.height = "25px";
	  searchInput.style["vertical-align"] = "top";
  	
  	addButton('searchButton','',buttons,search,null,    'Find', "http://cdn.flaticon.com/png/64/63/63975.png");
	}*/
	
	// =========================================================
  // Paging Buttons
	// =========================================================
	if(_count || _skip || _top){
	  var prevButton = addButton('prevButton','',buttons,prevPage,null,'previous page',"http://cdn.flaticon.com/png/64/64/64042.png");
	  if(_skip <= 0) prevButton.disabled = true;
	  
	  var stepSizeInput = document.createElement('input');
	  stepSizeInput.style.width = "2%";
	  stepSizeInput.style.height = "100%";
	  stepSizeInput.value = _stepSize;
	  stepSizeInput.style["vertical-align"] = "top";
	  stepSizeInput.id = "stepSizeInput";
	  stepSizeInput.onchange = function(){_stepSize = parseInt(stepSizeInput.value);};
	  buttons.appendChild(stepSizeInput);
	  
	  var nextButton = addButton('nextButton','',buttons,nextPage,null,'next page',"http://cdn.flaticon.com/png/64/64/64031.png");
	  if(_top+_skip >= _count) nextButton.disabled = true;
	  
	  // Change the step size on pressing enter
  	$(stepSizeInput).keypress(function(event){
  	  if(event.which == 13){
  	    
  	  window.location.href = window.location.href.replace(/\$top=[^&]/,'$top='+stepSizeInput.value);
  	  }
  	});
  	
	}
	else if(!_isSingleEntity){
    addButton('addPagingButton','',buttons,addPaging,null,'add paging',"http://cdn.flaticon.com/png/64/72/72419.png");
	}
	
	document.body.insertBefore(document.createElement("br"),document.body.firstChild);
	document.body.insertBefore(buttons,document.body.firstChild);
	
	// =========================================================
  // Selection Button
	// =========================================================
	var dialog            = document.createElement("dialog");
	dialog.id             = "selectDialog";
	
	document.body.appendChild(dialog);
	
	
	addButton('selectDialogButton','',buttons,
	  function(){
	    openSelectDialog();
	  },null,'select properties',"http://cdn.flaticon.com/png/64/36/36063.png"
	);
}

function openSelectDialog(){
  
    var dialog = document.getElementById("selectDialog");
    var i = 0;
    
    if(!dialog.innerHTML){
    	
    	// De/Select all
    	var selectDiv         = document.createElement('div');
    	selectDiv.className   = "selectPropData";
    	
    	var selectPropCheck   = document.createElement('input');
    	selectPropCheck.type  = 'checkbox';
    	selectPropCheck.id    = 'selectAll';
    	$(selectPropCheck).prop('checked', window.location.href.indexOf("$select") === -1);
    	selectPropCheck.className = "selectPropCheck";
    	
    	var selectPropLabel       = document.createElement('label');
    	selectPropLabel.className = "selectPropLabel";
    	selectPropLabel.innerHTML = "<b>Select All</b>";
      
      selectDiv.appendChild(selectPropCheck);
      selectDiv.appendChild(selectPropLabel);
    	dialog.appendChild(selectDiv);
    	
    	selectPropCheck.onclick = function(){
         for(var i=1; i<dialog.childNodes.length; i++){
           for(var j=0; j<dialog.childNodes[i].childNodes.length; j++){
             var propData = dialog.childNodes[i].childNodes[j];
             
             if(propData.className == "selectPropData"){
                $(propData).find(".selectPropCheck").prop('checked', document.getElementById("selectAll").checked);
             }
           }
         }
    	};
	
    	// Single properties
    	var selectableProps = getPropertyTypes(_entityName);
    	var selectableNavProps = getNavProps(_entityName,_content);
    	
    	var selectablePropsList = Object.keys(selectableProps);
    	selectablePropsList.sort();
    	
    	// Add nav props to selectable properties
    	var selectableNavPropsKeys = [];
    	for(i=0;i<selectableNavProps.length; i++){
    	  selectableProps[selectableNavProps[i]] = 'navProp';
    	  selectableNavPropsKeys[i] = selectableNavProps[i];
    	}
    	
    	selectableNavPropsKeys.sort();
      selectablePropsList = selectablePropsList.concat(selectableNavPropsKeys);
    	
    	var propGroup    = document.createElement("div");
    	propGroup.style.float="left";
    	var navGroup     = document.createElement("div");
    	navGroup.style.float="right";
    	dialog.appendChild(propGroup);
    	dialog.appendChild(navGroup);
    	
    	var selectionStr = window.location.href.match(/\$select=[^&]*/);
    	
    	for(i=0; i<selectablePropsList.length; i++){
    	  var selectProp        = selectablePropsList[i];
      	selectDiv             = document.createElement('div');
      	selectDiv.className   = "selectPropData";
      	selectPropCheck       = document.createElement('input');
      	selectPropCheck.type  = 'checkbox';
      	
      	// Check property if it has been selected before or if none were selected at all
    	  $(selectPropCheck).prop('checked', isURLSelected(selectablePropsList[i]) );
      	
      	selectPropCheck.className = "selectPropCheck";
      	selectPropLabel           = document.createElement('label');
      	selectPropLabel.className = "selectPropLabel";
      	selectPropLabel.innerHTML = selectProp;
        
        selectDiv.appendChild(selectPropCheck);
        selectDiv.appendChild(selectPropLabel);
        
        // Color nav props blue
        if(selectableProps[selectProp] == "navProp"){
          selectPropLabel.style.color = "blue";
          
          var extendImg = document.createElement("img");
          extendImg.src = "http://cdn.flaticon.com/png/64/61/61728.png";
      	  extendImg.style.float   = "right";
      	  extendImg.style.height  = "15px";
      	  extendImg.title         = "Expand";
      	  selectDiv.appendChild(extendImg);
      	  
          var extendCheck = document.createElement("input");
      	  extendCheck.type  = 'checkbox';
      	  extendCheck.style.float = "right";
      	  extendCheck.className = "expandPropCheck";
    	    
    	    $(extendCheck).prop('checked', isURLExpanded(selectablePropsList[i]) );
    	  
      	  selectDiv.appendChild(extendCheck);
      	  
      	  navGroup.appendChild(selectDiv);
        }else{
          propGroup.appendChild(selectDiv);
        }
    	}
    	
    	var selectDialogButtons = document.createElement("div");
    	
      addButton('confirmSelectButton','OK',selectDialogButtons, function(){
         dialog.close();
         
         var selectStmt = "$select=";
         var selectCnt  = 0;
         var expandStmt = "$expand=";
        
        for(var i=1; i<dialog.childNodes.length; i++){
          // Create select statement from select properties from dialog
           for(var j=0; j<dialog.childNodes[i].childNodes.length; j++){
             var propData = dialog.childNodes[i].childNodes[j];
             
             if(propData.className == "selectPropData"){
              var propName      = $(propData).find(".selectPropLabel")[0].innerHTML;
              var propSelected  = $(propData).find(".selectPropCheck")[0].checked;
              var propExpanded  = $(propData).find(".expandPropCheck")[0];
              
              if(propSelected){ selectStmt += propName+","; selectCnt++; }
              if(propExpanded && propExpanded.checked){ expandStmt += propName+","; }
             }
           }
        }
        
        // Remove all selections from current url
        var url = window.location.href.replace(/\?\$select[^&]*[&]?/,'?').replace(/[&]?\$select[^&]*/,'');
        
        // Remove all expansions from current url
        url     = url.replace(/\?\$expand[^&]*[&]?/,'?').replace(/[&]?\$expand[^&]*/,'');
        
        // Add selections if available
        if(selectStmt != "$select=" && Object.keys(selectableProps).length != selectCnt){
          url += "&"+selectStmt.substring(0,selectStmt.length-1);
         }
         
         // Add expansions if available
        if(expandStmt != "$expand="){
          url += "&"+expandStmt.substring(0,expandStmt.length-1);
         }
         
         // Load new url
         window.location = url;
      });
      addButton('cancelSelectButton','Cancel',selectDialogButtons, function(){
         dialog.close();
      });
    
      selectDialogButtons.style.height = "25px";
      dialog.appendChild(selectDialogButtons);
    	selectDialogButtons.style.float="bottom";
    
    }
  	document.getElementById("selectDialog").showModal();
}

function addPaging(){
  var select  =   window.location.href.match(/\$select=[^&]*/);
  var url     =   window.location.href.split('?')[0];
  url         +=  "?$format=json&"+((_odata_version < 4.0)? "$inlinecount=allpages" : "$count=true")+"&$top="+_stepSize+
                  (select? '&'+select : '');
  window.location = url;
}

function nextPage(){
  if(nextButton.disabled) return;
  
  var url = window.location.href.replace(/\?\$top[^&]*[&]?/,'?').replace(/[&]?\$top[^&]*/,'').replace(/\?\$skip[^&]*[&]?/,'?').replace(/[&]?\$skip[^&]*/,'');
  
  if(_count){
    _skip  = (_skip === 0)? _top : Math.min(_skip+_stepSize,_count);
    _top   = Math.min(_stepSize,_count-_skip);
  }else{
    _skip += _stepSize;
    _top  =  _stepSize;
  }
  
  url += '&$top='+_top+'&$skip='+_skip;
  window.location = url;
}

function prevPage(){
  if(prevButton.disabled) return;
  
  var url = window.location.href.replace(/\?\$top[^&]*[&]?/,'?').replace(/[&]?\$top[^&]*/,'').replace(/\?\$skip[^&]*[&]?/,'?').replace(/[&]?\$skip[^&]*/,'');
  
    _skip   = Math.max(_skip-_stepSize,0);
    
  if(_count){
    _top    = Math.min(_stepSize,_count-_skip);
  }else{
    _top  =  _stepSize;
  }
  
  url += '&$top='+_top+'&$skip='+_skip;
  window.location = url;
}

function expandAll(){
  var navLinks        = $('.expandLink');
  var tmpExpandParams = [];
  
  for(var i=0; i<navLinks.length; i++){
    tmpExpandParams = tmpExpandParams.concat(navLinks[i].href.split('expand=')[1].split('&')[0].split(','));
  }
  
  var expandParams = [];
  $.each(tmpExpandParams, function(i, value){
      if($.inArray(value, expandParams) === -1) expandParams.push(value);
  });
  
  var href;
  
  if(expandParams){
  	if(window.location.href.indexOf('expand') != -1){
      href = window.location.href.replace('expand=','expand='+expandParams+',');
    }else{
  	  href = window.location.href + ((window.location.search)? '&' : '?') + '$expand='+expandParams;
  	}
    
    window.location = href;
  }
}

// Generate zip file containing JSON files with all of the service's entities
function generateZip(){
 	var zip			= new JSZip();	
	var schema		= _metadata.Edmx.DataServices.Schema;
	var entitySets	= schema.EntityContainer || schema[1].EntityContainer;
    entitySets		= entitySets.EntitySet;
    var failedSets	= [];
	
	// Add metadata document to zip file
	$.ajax({
		  url: _root+'/$metadata',	type: "GET",
		  dataType: "text",			async: false,
		  success: function(data) {
			zip.file("metadata.xml", data);
		  }
	});
	
	// Add entityset data to zip file
	for(var i=0; i<entitySets.length; i++){
		var entitySetName = entitySets[i]._Name;

		$.ajax({
              url: _root+'/'+entitySetName+'?$format=json',
              type: "GET",
              async: false,
              success: function(data) {
              	try{
              		data = data.d.results;
              		for(var j=0; j<data.length; j++){
              			delete data[j].__metadata;
						
						// Remove nav props / deferred references
						var objKeys = Object.keys(data[j]);
              			for(var k=0; k<objKeys.length; k++){
              				var prop = data[j][objKeys[k]];
              				if(prop && typeof prop === 'object' && prop.__deferred){
              					delete data[j][objKeys[k]];
              				}
              			}
              		}
              	}catch(e){console.log(e);}
              	
				// Add entityset content as json file to zip
              	zip.file(entitySetName+".json", JSON.stringify(data,null,"\t"));
              },
              error: function(data){
				failedSets.push(entitySetName);
              }
        });		
	}
	
	// Generate zip file
    zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:9}}).
    then(function (blob) {
		window.location	=  URL.createObjectURL(blob);
    }, function (err) {
      console.log(err);
    });
	
	// Inform about failed requests / data sets
    if(failedSets.length > 0){
    	alert("Failed sets:\n"+JSON.stringify(failedSets,null,"\t"));
    }
}

function collapseAll(){
  var href = window.location.href.replace(/&\$expand=[^&]*/,'').replace(/\$expand=[^&]*/,'');
  window.location = href;
}

function search(event){
  if(event.keyCode === 0 || event.keyCode == 13){
    window.location = window.location.href.replace(/\$filter[^&]*/,'')+ 
                      ((window.location.search)? '&':'?')+
                      '$filter='+searchInput.value+'&$format=json';
  }
}

var _sourceFormatted = false;
function showSource(){
	var formatted = document.getElementById("formattedContent");
	var source 	  = document.getElementById("sourceContent");
	var srcButton = document.getElementById('sourceButton');
	var showSrc   = (source.style.display == "none");
	
	if(!_sourceFormatted){
	  source.innerHTML = JSON.stringify(JSON.parse(source.innerHTML),null,"\t");
	  _sourceFormatted = true;
	}
	
	formatted.style.display = (showSrc)? "none"           : "";
	source.style.display    = (showSrc)? ""               : "none";
	srcButton.style["border-style"]       = (showSrc)? "inset" : "";
	srcButton.title     = (showSrc)? 'Show formatted' : 'Show source';
}

function toggleEditable(){
	_editMode = !_editMode;
	
	var propInputs = document.getElementsByClassName('propertyInput');
	
	for(var i=0; i<propInputs.length; i++){
		if(typeof propInputs[i] != 'object'){ continue; }
		propInputs[i].style["border-style"] = (_editMode)? "solid" : "none";
		
		if(_editMode){
		  propInputs[i].removeAttribute("readonly");
    	editButton.style["border-style"] = "inset";
		}else{
		  propInputs[i].setAttribute("readonly",true);
    	editButton.style["border-style"] = "";
		}
	}
	
	$('.useForCreate').toggle();
	$('.useForCreateLabel').toggle();
	$('.usePropForCreate').toggle();
	
	document.getElementById('updateButton').disabled = (!_editMode || !_isSingleEntity);
	
	$('.idFieldLink').toggle(!_editMode);
	$('.idFieldInput').toggle(_editMode);
}

function writeToDB(property,value,insert){
  try{
    var db = openDatabase('ODataTool', '1.0', 'OData Tool Information', 2 * 1024 * 1024);
    
    db.transaction(function(tx) {
      tx.executeSql("create table if not exists info (property string primary key asc, value string)");
    });
    
    db.transaction(function(tx) {
      if(insert){
        tx.executeSql("insert into info (property,value) values(?,?);",[property,value],
          function(e) { console.log(property+" written."); }
        );
      }else{
        tx.executeSql("update info set value=? where property=?;",[value,property],
          function() { console.log(property+" updated."); }
        );
      }
    });
    
    _dbProps[property] = value;
  }catch(e){}
}

var _dbProps = {};
function readFromDB(property){
  try{
    var db = openDatabase('ODataTool', '1.0', 'OData Tool Information', 2 * 1024 * 1024);
    var value;
    
    db.transaction(function(tx) {
      tx.executeSql("create table if not exists info (property string primary key asc, value string)");
    });
    
    db.transaction(function(tx) {
      tx.executeSql('SELECT VALUE FROM INFO WHERE PROPERTY = "'+property+'"', [], function (tx, results) {
        if(results.rows.length > 0) _dbProps[property] = results.rows.item(0).value;
        
    console.log(_dbProps);
      }, null);
    });
    console.log(_dbProps);
    return _dbProps[property];
  }catch(e){}
}

function readAllFromDB(){
  try{
    var db = openDatabase('ODataTool', '1.0', 'OData Tool Information', 2 * 1024 * 1024);
    
    db.transaction(function(tx) {
      tx.executeSql("create table if not exists info (property string primary key asc, value string)");
    });
    
    db.transaction(function(tx) {
      tx.executeSql("create table if not exists services (root string primary key asc, metadata string)");
    });
    
    db.transaction(function(tx) {
      tx.executeSql('SELECT * FROM INFO', [], function (tx, results){
        for(var i=0; i<results.rows.length;i++){
          var item = results.rows.item(i);
          _dbProps[item.property] = item.value;
        }
        
        var db = openDatabase('ODataTool', '1.0', 'OData Tool Information', 2 * 1024 * 1024);
        
        db.transaction(function(tx) {
          tx.executeSql('select * from services', [], function (tx, results){
            for(var i=0; i<results.rows.length;i++){
              var item = results.rows.item(i);
              _services[item.root] = item.metadata;
            }
            
            init();
          }, null);
        });
        
      }, null);
    });
  }catch(e){
    init();
  }
}

var _services = {};
function addService(root,metadata,insert){
  try{
    var db = openDatabase('ODataTool', '1.0', 'OData Tool Information', 2 * 1024 * 1024);
    
    db.transaction(function(tx) {
      tx.executeSql("create table if not exists services (root string primary key asc, metadata string)");
    });
    
    db.transaction(function(tx) {
      if(insert){
        tx.executeSql("insert into services (root,metadata) values(?,?);",[root,metadata],
          function(e) { console.log("service added."); }
        );
      }else{
        tx.executeSql("update info set metadata=? where root=?;",[metadata,root],
          function() { console.log("service updated."); }
        );
      }
    });
    
    _services[root] = metadata;
  }catch(e){}
}