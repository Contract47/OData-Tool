chrome.storage.sync.get({enabled:true}, function(options) {
  if(!options.enabled){
    $(".disableable").prop("disabled",true);
  }
});

$("#enabled").click(function(){ $(".disableable").prop("disabled", !$("#enabled").prop("checked")); });

// Saves options to chrome.storage
function save_options() {
  chrome.storage.sync.set(getOptions(), function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
    
    window.close();
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(getOptions(), function(options) {
    console.log(options);
    setOptions(options);
  });
}

function setOptions(options){
  var tab     = document.getElementById("options");
  var rowCnt  = tab.rows.length;
  
  for(var i=0; i<rowCnt; i++){
    var cells = tab.rows[i].cells;
    cells[1].childNodes[0].checked = options[cells[0].childNodes[0].innerHTML];
  }
  
  $('#updateMethod option:contains("'+(options.updateMethod || 'PUT')+'")').prop('selected',true); 
}

function getOptions(){
  var tab     = document.getElementById("options");
  var rowCnt  = tab.rows.length;
  var options = {};
  
  for(var i=0; i<rowCnt; i++){
    var cells = tab.rows[i].cells;
    options[cells[0].childNodes[0].innerHTML] = cells[1].childNodes[0].checked;
  }
  
  options.updateMethod = $( "#updateMethod option:selected" ).text();
  
  return options;
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);

