// ==================================================================
// Add Fiori specific context menu action impl. to get OData Binding
// ==================================================================
/*var fioriElemIDHandling = {
  run: function(){
    function getObject(id){ return sap.ui.getCore().byId(id); }
    
    window.addEventListener('message', function(event) {
  
      if (event.source !== window) { return; }
      
      var message = event.data;
      
      if (typeof message === 'object' && message.id){
      	var obj  = getObject(message.id);
      	if(!obj){ return; }
      
      	console.log('found object:');
      	console.log(obj);
      
      	var context = obj.getBindingContext();
      	var path;
      	if(context){ path = context.sPath; }
      	if(!path){ path = obj.getElementBinding().getPath();}
      	var prop = obj.mBindingInfos.text.binding.sPath;
      	alert(path+(prop? '=>'+prop : ''));
    	}
    });
  }
};

// Add message listener to local scripts
var script = document.createElement("script");
script.innerHTML = (fioriElemIDHandling.run + "");
script.innerHTML = script.innerHTML.substring(0,script.innerHTML.length-1).replace("function (){","");

document.body.appendChild(script);

//listen for context menu message from extension
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch(request.method){
      case "showData":
        //console.log(request.info);
        //console.log(request.tab);
        var node = window.getSelection().anchorNode;
        while(node.nodeType !== 1){
          node = node.parentNode;
        }
        
        var id = node.getAttribute("id");
        
        window.postMessage({
          id: id
        }, '*');
        
        break;
    }
  }
);*/
// ==================================================================
// ==================================================================